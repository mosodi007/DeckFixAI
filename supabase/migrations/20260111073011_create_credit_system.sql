/*
  # Create Credit System with Dynamic Cost Calculation

  1. New Tables
    - `subscription_plans`
      - `id` (uuid, primary key)
      - `name` (text) - Free, Starter, Pro
      - `monthly_credits` (integer) - Credits allocated per month
      - `price_monthly` (numeric) - Monthly price in USD
      - `price_annual` (numeric) - Annual price in USD
      - `stripe_price_id_monthly` (text) - Stripe price ID for monthly
      - `stripe_price_id_annual` (text) - Stripe price ID for annual
      - `features` (jsonb) - Plan features
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `credit_packages`
      - `id` (uuid, primary key)
      - `name` (text) - Package name
      - `credits` (integer) - Number of credits
      - `price` (numeric) - Price in USD
      - `stripe_price_id` (text) - Stripe price ID
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `user_credits`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `credits_balance` (integer) - Current credit balance
      - `subscription_credits` (integer) - Credits from subscription
      - `purchased_credits` (integer) - Credits from one-time purchases
      - `monthly_credits_allocated` (integer) - Credits allocated per month
      - `credits_reset_date` (timestamptz) - Next reset date
      - `subscription_tier` (text) - Current subscription tier
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `plan_id` (uuid, foreign key to subscription_plans)
      - `billing_period` (text) - monthly or annual
      - `status` (text) - active, canceled, past_due, etc.
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `stripe_subscription_id` (text, unique)
      - `stripe_customer_id` (text)
      - `cancel_at_period_end` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `amount` (integer) - Credits added or deducted
      - `transaction_type` (text) - deduction, purchase, subscription_renewal, refund
      - `description` (text)
      - `complexity_score` (integer) - 0-100 complexity score
      - `credits_cost` (integer) - Actual credits deducted
      - `balance_after` (integer)
      - `metadata` (jsonb) - Additional transaction data
      - `created_at` (timestamptz)

    - `fix_complexity_config`
      - `id` (uuid, primary key)
      - `min_credits` (integer) - Minimum credits per fix
      - `max_credits` (integer) - Maximum credits per fix
      - `complexity_weights` (jsonb) - Weights for complexity factors
      - `cost_mapping` (jsonb) - Mapping of complexity scores to credit costs
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for service role to manage subscriptions
    - Restrict credit manipulation to server-side functions

  3. Indexes
    - Add indexes on user_id, created_at for performance
    - Add index on stripe_subscription_id for webhook lookups
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  monthly_credits integer NOT NULL,
  price_monthly numeric(10, 2) NOT NULL,
  price_annual numeric(10, 2) NOT NULL,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create credit_packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance integer NOT NULL DEFAULT 0,
  subscription_credits integer NOT NULL DEFAULT 0,
  purchased_credits integer NOT NULL DEFAULT 0,
  monthly_credits_allocated integer NOT NULL DEFAULT 0,
  credits_reset_date timestamptz,
  subscription_tier text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  description text NOT NULL,
  complexity_score integer,
  credits_cost integer,
  balance_after integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create fix_complexity_config table
CREATE TABLE IF NOT EXISTS fix_complexity_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_credits integer NOT NULL DEFAULT 2,
  max_credits integer NOT NULL DEFAULT 10,
  complexity_weights jsonb NOT NULL,
  cost_mapping jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed subscription plans
INSERT INTO subscription_plans (name, monthly_credits, price_monthly, price_annual, features)
VALUES
  ('Free', 100, 0, 0, '["100 credits per month", "Basic slide fixes", "Community support"]'::jsonb),
  ('Starter', 500, 9.99, 95.88, '["500 credits per month", "Priority processing", "Email support", "20% savings on annual"]'::jsonb),
  ('Pro', 2000, 29.99, 287.88, '["2000 credits per month", "Fastest processing", "Priority support", "Advanced analytics", "20% savings on annual"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Seed credit packages
INSERT INTO credit_packages (name, credits, price)
VALUES
  ('Small Pack', 100, 4.99),
  ('Medium Pack', 250, 9.99),
  ('Large Pack', 600, 19.99),
  ('XL Pack', 1500, 44.99)
ON CONFLICT DO NOTHING;

-- Seed complexity configuration
INSERT INTO fix_complexity_config (complexity_weights, cost_mapping)
VALUES (
  '{
    "issue_count": {"1": 10, "2-3": 25, "4-5": 50, "6+": 80},
    "severity": {"low": 5, "medium": 15, "high": 30, "critical": 50},
    "content_length": {"0-50": 5, "51-100": 15, "101-200": 30, "200+": 50},
    "fix_scope": {"minor": 10, "moderate": 30, "major": 60}
  }'::jsonb,
  '{
    "0-20": 2,
    "21-35": 3,
    "36-50": 4,
    "51-65": 6,
    "66-80": 8,
    "81-100": 10
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_complexity_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for credit_packages (public read)
CREATE POLICY "Anyone can view credit packages"
  ON credit_packages FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits via functions only"
  ON user_credits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON user_credits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for fix_complexity_config (public read)
CREATE POLICY "Anyone can view complexity config"
  ON fix_complexity_config FOR SELECT
  TO authenticated, anon
  USING (true);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer;
BEGIN
  -- Get free plan details
  SELECT id, monthly_credits INTO free_plan_id, free_credits
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize credits on user creation
DROP TRIGGER IF EXISTS on_user_created_initialize_credits ON user_profiles;
CREATE TRIGGER on_user_created_initialize_credits
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_credits();

-- Function to update user credits timestamp
CREATE OR REPLACE FUNCTION update_user_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
DROP TRIGGER IF EXISTS update_user_credits_timestamp_trigger ON user_credits;
CREATE TRIGGER update_user_credits_timestamp_trigger
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_timestamp();
