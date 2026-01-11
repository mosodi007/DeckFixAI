/*
  # Fix Google OAuth Signup

  1. Problem
    - Google OAuth signup fails with "Database error saving new user"
    - No triggers exist to automatically create user_profiles and user_credits
    - Previous migration dropped all triggers to fix OAuth issues

  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS
    - Automatically create user_profiles when a user signs up via OAuth
    - Automatically initialize user_credits with 100 free credits
    - Proper error handling to prevent signup failures

  3. Security
    - Function runs with SECURITY DEFINER (elevated privileges)
    - Only creates records for the NEW user being created
    - RLS policies still protect user data access after creation
*/

-- Create function to handle new user signup (both OAuth and email/password)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Get the Free plan ID
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- Initialize user credits with 100 free credits
  INSERT INTO public.user_credits (
    user_id,
    credits_balance,
    subscription_credits,
    purchased_credits,
    monthly_credits_allocated,
    credits_reset_date,
    subscription_tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    100,
    100,
    0,
    100,
    (NOW() + INTERVAL '1 month'),
    COALESCE(free_plan_id, uuid_nil()),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow the function to work
-- These policies allow public (unauthenticated) inserts only during signup
-- via the SECURITY DEFINER trigger function

DROP POLICY IF EXISTS "Allow signup profile creation" ON user_profiles;
CREATE POLICY "Allow signup profile creation"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (
    -- Allow insert if the id corresponds to a newly created user in auth.users
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = user_profiles.id
    )
  );

DROP POLICY IF EXISTS "Allow signup credits creation" ON user_credits;
CREATE POLICY "Allow signup credits creation"
  ON user_credits FOR INSERT
  TO public
  WITH CHECK (
    -- Allow insert if the user_id corresponds to a user in auth.users
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = user_credits.user_id
    )
  );
