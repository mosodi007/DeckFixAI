/*
  # Fix OAuth Signup Trigger

  ## Problem
  The `handle_new_user()` trigger was failing during Google OAuth signup because
  RLS policies were blocking the profile creation, causing "Database error saving new user".

  ## Solution
  - Drop and recreate the trigger function with proper permissions
  - The function now properly bypasses RLS since it runs as SECURITY DEFINER
  - Added error handling to prevent signup failures

  ## Security
  - Function is SECURITY DEFINER but only inserts data for the newly created user
  - No risk of privilege escalation as it only operates on NEW.id
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile for the new user
  -- SECURITY DEFINER allows this to bypass RLS
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Update the INSERT policy to be less restrictive for the trigger
DROP POLICY IF EXISTS "Allow profile creation on signup" ON user_profiles;

CREATE POLICY "Allow profile creation on signup"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add a policy that allows service role to insert (for trigger)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
