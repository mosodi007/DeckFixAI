/*
  # Fix Ambiguous Column Reference

  1. Changes
    - Fix the ambiguous column reference in allocate_credits_from_stripe function
    - Use proper variable naming to avoid conflicts with table columns
*/

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
  v_subscription_id text;
  v_period_start bigint;
  v_period_end bigint;
BEGIN
  -- Extract subscription details if available
  v_subscription_id := p_stripe_metadata->>'subscription_id';
  
  -- For subscription renewals, check if we've already allocated credits for this period
  IF p_transaction_type = 'subscription_renewal' AND v_subscription_id IS NOT NULL THEN
    -- Get the period from stripe_subscriptions
    SELECT ss.current_period_start, ss.current_period_end
    INTO v_period_start, v_period_end
    FROM stripe_subscriptions ss
    JOIN stripe_customers sc ON sc.customer_id = ss.customer_id
    WHERE sc.user_id = p_user_id
    AND ss.subscription_id = v_subscription_id
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
        v_subscription_id,
        v_period_start,
        v_period_end,
        p_credits
      );
    EXCEPTION WHEN unique_violation THEN
      -- Credits already allocated for this period, skip
      RAISE NOTICE 'Credits already allocated for subscription % period %', v_subscription_id, v_period_start;
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
    -- ADD subscription credits to the balance (for both renewals and upgrades)
    UPDATE user_credits
    SET 
      credits_balance = credits_balance + p_credits,
      subscription_credits = subscription_credits + p_credits,
      monthly_credits_allocated = p_credits,
      subscription_tier = 'pro',
      credits_reset_date = date_trunc('month', now()) + interval '1 month'
    WHERE user_id = p_user_id;
  ELSIF p_transaction_type = 'purchase' THEN
    -- ADD one-time purchase credits
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
