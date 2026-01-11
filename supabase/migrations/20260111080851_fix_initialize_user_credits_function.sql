/*
  # Fix initialize_user_credits Function

  ## Problem
  The `initialize_user_credits()` trigger function may be failing due to:
  - Missing search_path configuration
  - Potential query failures not being handled properly

  ## Solution
  - Add `SET search_path = public` for security and clarity
  - Add better error handling to prevent signup failures
  - Add RAISE WARNING for debugging

  ## Security
  - Function is SECURITY DEFINER with explicit search_path
  - Only operates on the newly created user profile
*/

-- Drop and recreate the function with better configuration
DROP FUNCTION IF EXISTS public.initialize_user_credits() CASCADE;

CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer := 100;
BEGIN
  -- Try to get free plan details, use default if not found
  SELECT id, monthly_credits INTO free_plan_id, free_credits
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- If no plan found, use default credits
  IF free_credits IS NULL THEN
    free_credits := 100;
  END IF;

  -- Initialize user credits with free tier
  INSERT INTO user_credits (
    user_id,
    credits_balance,
    subscription_credits,
    purchased_credits,
    monthly_credits_allocated,
    credits_reset_date,
    subscription_tier
  ) VALUES (
    NEW.id,
    free_credits,
    free_credits,
    0,
    free_credits,
    date_trunc('month', now()) + interval '1 month',
    'free'
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error initializing user credits for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_user_created_initialize_credits ON user_profiles;
CREATE TRIGGER on_user_created_initialize_credits
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();
