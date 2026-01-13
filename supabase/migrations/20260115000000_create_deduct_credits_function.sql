/*
  # Create deduct_credits Function
  
  This function safely deducts credits from a user's account with proper validation
  to prevent negative balances.
*/

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer, text, jsonb);

CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer AS $$
DECLARE
  current_balance integer;
  current_subscription_credits integer;
  current_purchased_credits integer;
  new_balance integer;
  new_subscription_credits integer;
  new_purchased_credits integer;
BEGIN
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

  -- Check if user has credit record
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User credit record not found';
  END IF;

  -- Validate sufficient credits BEFORE deducting
  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', current_balance, p_amount;
  END IF;

  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Ensure balance doesn't go negative (safety check)
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Credit deduction would result in negative balance';
  END IF;

  -- Deduct from subscription credits first, then purchased credits
  IF current_subscription_credits >= p_amount THEN
    new_subscription_credits := current_subscription_credits - p_amount;
    new_purchased_credits := current_purchased_credits;
  ELSE
    -- Use all subscription credits, then deduct from purchased
    new_subscription_credits := 0;
    new_purchased_credits := current_purchased_credits - (p_amount - current_subscription_credits);
    
    -- Ensure purchased credits don't go negative
    IF new_purchased_credits < 0 THEN
      RAISE EXCEPTION 'Insufficient credits. Subscription: %, Purchased: %, Required: %', 
        current_subscription_credits, current_purchased_credits, p_amount;
    END IF;
  END IF;

  -- Update user credits
  UPDATE user_credits
  SET 
    credits_balance = new_balance,
    subscription_credits = new_subscription_credits,
    purchased_credits = new_purchased_credits,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    credits_cost,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount,
    'deduction',
    p_description,
    p_amount,
    new_balance,
    p_metadata
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits(uuid, integer, text, jsonb) TO authenticated;
