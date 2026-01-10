/*
  # Fix Credit Initialization for Users

  ## Overview
  Ensures all users (existing and new) have their credit balances properly initialized.

  ## Changes
  1. Initialize credits for existing users who don't have credit records
  2. Verify trigger chain for new user credit initialization
  3. Add transaction record for initial credit grant

  ## Security
  - Maintains existing RLS policies
  - No security changes
*/

-- Initialize credits for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
  free_credits integer := 100;
BEGIN
  FOR user_record IN
    SELECT up.id, up.email
    FROM user_profiles up
    LEFT JOIN user_credits uc ON up.id = uc.user_id
    WHERE uc.user_id IS NULL
  LOOP
    -- Create credit record
    INSERT INTO user_credits (
      user_id,
      credits_balance,
      subscription_credits,
      purchased_credits,
      monthly_credits_allocated,
      credits_reset_date,
      subscription_tier
    ) VALUES (
      user_record.id,
      free_credits,
      free_credits,
      0,
      free_credits,
      date_trunc('month', now()) + interval '1 month',
      'free'
    );

    -- Create initial transaction record
    INSERT INTO credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      balance_after,
      metadata
    ) VALUES (
      user_record.id,
      free_credits,
      'subscription_renewal',
      'Welcome bonus: Free plan credits',
      free_credits,
      jsonb_build_object('plan', 'free', 'initial_grant', true)
    );

    RAISE NOTICE 'Initialized credits for user: %', user_record.email;
  END LOOP;
END $$;

-- Recreate the trigger function to ensure it works correctly and includes transaction
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer := 100;
BEGIN
  -- Get free plan details (if available)
  SELECT id, monthly_credits INTO free_plan_id, free_credits
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- Use default if no plan found
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

  -- Create initial transaction record
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  ) VALUES (
    NEW.id,
    free_credits,
    'subscription_renewal',
    'Welcome bonus: Free plan credits',
    free_credits,
    jsonb_build_object('plan', 'free', 'initial_grant', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_user_created_initialize_credits ON user_profiles;
CREATE TRIGGER on_user_created_initialize_credits
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();
