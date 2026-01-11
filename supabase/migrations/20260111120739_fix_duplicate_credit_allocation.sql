/*
  # Fix Duplicate Credit Allocation Issue

  1. Changes
    - Add unique constraint to prevent duplicate credit allocations for the same subscription period
    - Create a subscription_credit_periods table to track when credits were allocated
    - Update allocate_credits_from_stripe function to use proper deduplication
    
  2. Security
    - Maintains existing RLS policies
*/

-- Create table to track subscription credit periods
CREATE TABLE IF NOT EXISTS subscription_credit_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subscription_id text NOT NULL,
  period_start bigint NOT NULL,
  period_end bigint NOT NULL,
  credits_allocated integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subscription_id, period_start)
);

ALTER TABLE subscription_credit_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit periods"
  ON subscription_credit_periods
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update the allocate_credits_from_stripe function to use proper deduplication
CREATE OR REPLACE FUNCTION allocate_credits_from_stripe(
  p_user_id uuid,
  p_credits integer,
  p_transaction_type text,
  p_stripe_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
  current_subscription_credits integer;
  current_purchased_credits integer;
  subscription_id text;
  period_start bigint;
  period_end bigint;
BEGIN
  -- Extract subscription details if available
  subscription_id := p_stripe_metadata->>'subscription_id';
  
  -- For subscription renewals, check if we've already allocated credits for this period
  IF p_transaction_type = 'subscription_renewal' AND subscription_id IS NOT NULL THEN
    -- Get the period from stripe_subscriptions
    SELECT current_period_start, current_period_end
    INTO period_start, period_end
    FROM stripe_subscriptions ss
    JOIN stripe_customers sc ON sc.customer_id = ss.customer_id
    WHERE sc.user_id = p_user_id
    AND ss.subscription_id = subscription_id
    LIMIT 1;
    
    -- Try to insert into subscription_credit_periods (will fail if already exists)
    BEGIN
      INSERT INTO subscription_credit_periods (
        user_id,
        subscription_id,
        period_start,
        period_end,
        credits_allocated
      ) VALUES (
        p_user_id,
        subscription_id,
        period_start,
        period_end,
        p_credits
      );
    EXCEPTION WHEN unique_violation THEN
      -- Credits already allocated for this period, skip
      RAISE NOTICE 'Credits already allocated for subscription % period %', subscription_id, period_start;
      RETURN false;
    END;
  END IF;

  -- Get current credit state
  SELECT 
    credits_balance, 
    subscription_credits, 
    purchased_credits
  INTO 
    current_balance, 
    current_subscription_credits, 
    current_purchased_credits
  FROM user_credits
  WHERE user_id = p_user_id;

  -- If user doesn't have credit record, create one
  IF NOT FOUND THEN
    INSERT INTO user_credits (
      user_id,
      credits_balance,
      subscription_credits,
      purchased_credits,
      monthly_credits_allocated,
      subscription_tier
    ) VALUES (
      p_user_id,
      p_credits,
      CASE WHEN p_transaction_type = 'subscription_renewal' THEN p_credits ELSE 0 END,
      CASE WHEN p_transaction_type = 'purchase' THEN p_credits ELSE 0 END,
      CASE WHEN p_transaction_type = 'subscription_renewal' THEN p_credits ELSE 0 END,
      CASE WHEN p_transaction_type = 'subscription_renewal' THEN 'pro' ELSE 'free' END
    );

    current_balance := 0;
    current_subscription_credits := 0;
    current_purchased_credits := 0;
  END IF;

  -- Update credits based on transaction type
  IF p_transaction_type = 'subscription_renewal' THEN
    -- For subscription renewals, REPLACE the subscription credits (not add)
    UPDATE user_credits
    SET 
      credits_balance = credits_balance - subscription_credits + p_credits,
      subscription_credits = p_credits,
      monthly_credits_allocated = p_credits,
      subscription_tier = 'pro',
      credits_reset_date = date_trunc('month', now()) + interval '1 month'
    WHERE user_id = p_user_id;
  ELSIF p_transaction_type = 'purchase' THEN
    UPDATE user_credits
    SET 
      credits_balance = credits_balance + p_credits,
      purchased_credits = purchased_credits + p_credits
    WHERE user_id = p_user_id;
  END IF;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    p_credits,
    p_transaction_type,
    CASE 
      WHEN p_transaction_type = 'subscription_renewal' THEN 'Monthly subscription credit allocation'
      WHEN p_transaction_type = 'purchase' THEN 'Credit pack purchase'
      ELSE 'Credit allocation from Stripe'
    END,
    current_balance + p_credits,
    p_stripe_metadata
  );

  RETURN true;
END;
$$;
