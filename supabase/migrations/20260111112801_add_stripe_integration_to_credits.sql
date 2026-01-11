/*
  # Integrate Stripe with Credit System
  
  1. Updates
    - Add index to stripe_customers for faster lookups
    - Add index to stripe_subscriptions for webhook processing
    - Ensure proper cascade relationships
    
  2. Functions
    - Create helper function to allocate credits from Stripe payments
    - Create function to map Stripe price IDs to credit amounts
    
  3. Security
    - Add service role policies for webhook operations
*/

-- Add indexes for Stripe lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id ON stripe_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_subscription_id ON stripe_subscriptions(subscription_id);

-- Add policies for service role to manage credits via webhooks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_credits' 
    AND policyname = 'Service role can update user credits'
  ) THEN
    CREATE POLICY "Service role can update user credits"
      ON user_credits FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'credit_transactions' 
    AND policyname = 'Service role can insert credit transactions'
  ) THEN
    CREATE POLICY "Service role can insert credit transactions"
      ON credit_transactions FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_customers' 
    AND policyname = 'Service role can manage stripe_customers'
  ) THEN
    CREATE POLICY "Service role can manage stripe_customers"
      ON stripe_customers FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_subscriptions' 
    AND policyname = 'Service role can manage stripe_subscriptions'
  ) THEN
    CREATE POLICY "Service role can manage stripe_subscriptions"
      ON stripe_subscriptions FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_orders' 
    AND policyname = 'Service role can manage stripe_orders'
  ) THEN
    CREATE POLICY "Service role can manage stripe_orders"
      ON stripe_orders FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Function to get credit amount from Stripe price ID
CREATE OR REPLACE FUNCTION get_credits_from_price_id(price_id text)
RETURNS integer AS $$
DECLARE
  credit_amount integer;
BEGIN
  -- Check pro_credit_tiers first
  SELECT credits INTO credit_amount
  FROM pro_credit_tiers
  WHERE stripe_price_id_monthly = price_id OR stripe_price_id_annual = price_id
  LIMIT 1;
  
  IF credit_amount IS NOT NULL THEN
    RETURN credit_amount;
  END IF;
  
  -- Check credit_packages
  SELECT credits INTO credit_amount
  FROM credit_packages
  WHERE stripe_price_id = price_id
  LIMIT 1;
  
  RETURN COALESCE(credit_amount, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allocate credits from Stripe payment
CREATE OR REPLACE FUNCTION allocate_credits_from_stripe(
  p_user_id uuid,
  p_credits integer,
  p_transaction_type text,
  p_stripe_metadata jsonb
)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
  current_subscription_credits integer;
  current_purchased_credits integer;
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
    UPDATE user_credits
    SET 
      credits_balance = credits_balance + p_credits,
      subscription_credits = subscription_credits + p_credits,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
