/*
  # Fix Missing Credits for Google OAuth Users

  ## Problem
  - Some users (especially Google OAuth users) don't have user_profiles or user_credits initialized
  - Credits are not showing in the header for these users
  - New accounts should get 100 free credits but it's not working for Google accounts

  ## Solution
  1. Create user_profiles for users who don't have them
  2. Initialize user_credits with 100 free credits for users who don't have them
  3. Add transaction records for the initial credit grant
  4. Ensure the handle_new_user trigger function is robust and handles all cases
*/

-- Step 1: Create user_profiles for users who don't have them
INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(COALESCE(u.email, ''), '@', 1)
  ) as full_name,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE up.id IS NULL
  AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Step 2: Initialize user_credits with 100 free credits for users who don't have them
DO $$
DECLARE
  user_record RECORD;
  free_plan_id uuid;
  free_credits integer := 100;
BEGIN
  -- Get free plan ID
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- Loop through users without credits
  FOR user_record IN
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    LEFT JOIN public.user_credits uc ON u.id = uc.user_id
    WHERE uc.user_id IS NULL
      AND u.email IS NOT NULL
  LOOP
    -- Create credit record
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
      user_record.id,
      free_credits,
      free_credits,
      0,
      free_credits,
      (NOW() + INTERVAL '1 month'),
      COALESCE(free_plan_id, uuid_nil()),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create initial transaction record
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      balance_after,
      credits_cost,
      metadata,
      created_at
    )
    VALUES (
      user_record.id,
      free_credits,
      'subscription_renewal',
      'Welcome bonus: Free plan credits',
      free_credits,
      free_credits,
      jsonb_build_object('plan', 'free', 'initial_grant', true, 'backfill', true),
      NOW()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Initialized credits for user: % (%)', user_record.email, user_record.id;
  END LOOP;
END $$;

-- Step 3: Improve handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer := 100;
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
    free_credits,
    free_credits,
    0,
    free_credits,
    (NOW() + INTERVAL '1 month'),
    COALESCE(free_plan_id, uuid_nil()),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create initial transaction record
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    credits_cost,
    metadata,
    created_at
  )
  VALUES (
    NEW.id,
    free_credits,
    'subscription_renewal',
    'Welcome bonus: Free plan credits',
    free_credits,
    free_credits,
    jsonb_build_object('plan', 'free', 'initial_grant', true),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 4: Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

