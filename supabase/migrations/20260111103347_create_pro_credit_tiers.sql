/*
  # Create Pro Credit Tiers System

  1. New Tables
    - `pro_credit_tiers`
      - `id` (uuid, primary key)
      - `credits` (integer) - Number of credits per month
      - `price_monthly` (numeric) - Monthly price in USD
      - `price_annual` (numeric) - Annual price in USD
      - `stripe_price_id_monthly` (text) - Stripe price ID for monthly billing
      - `stripe_price_id_annual` (text) - Stripe price ID for annual billing
      - `display_order` (integer) - Order to display in dropdown
      - `is_active` (boolean) - Whether this tier is available
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contact_requests`
      - `id` (uuid, primary key)
      - `name` (text) - Contact name
      - `email` (text) - Contact email
      - `company` (text) - Company name
      - `estimated_usage` (text) - Estimated monthly credit usage
      - `message` (text) - Additional message
      - `status` (text) - pending, contacted, converted
      - `created_at` (timestamptz)

  2. Updates
    - Add `selected_credit_tier` column to user_subscriptions
    - Mark Starter plan as inactive
    - Add Custom plan to subscription_plans

  3. Security
    - Enable RLS on pro_credit_tiers (public read)
    - Enable RLS on contact_requests (authenticated users can insert their own)

  4. Seed Data
    - Insert 5 Pro credit tier options with pricing:
      - 500 credits: $9.99/month, $95.90/year (baseline)
      - 1,000 credits: $17.99/month, $172.70/year (10% discount)
      - 2,000 credits: $33.99/month, $326.30/year (15% discount)
      - 5,000 credits: $74.99/month, $719.90/year (25% discount)
      - 10,000 credits: $139.99/month, $1,343.90/year (30% discount)
    - Add Custom plan to subscription_plans
*/

-- Create pro_credit_tiers table
CREATE TABLE IF NOT EXISTS pro_credit_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credits integer NOT NULL UNIQUE,
  price_monthly numeric(10, 2) NOT NULL,
  price_annual numeric(10, 2) NOT NULL,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  estimated_usage text,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted')),
  created_at timestamptz DEFAULT now()
);

-- Add selected_credit_tier column to user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'selected_credit_tier'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN selected_credit_tier integer;
  END IF;
END $$;

-- Seed pro_credit_tiers with pricing data
INSERT INTO pro_credit_tiers (credits, price_monthly, price_annual, display_order)
VALUES
  (500, 9.99, 95.90, 1),
  (1000, 17.99, 172.70, 2),
  (2000, 33.99, 326.30, 3),
  (5000, 74.99, 719.90, 4),
  (10000, 139.99, 1343.90, 5)
ON CONFLICT (credits) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Mark Starter plan as inactive
UPDATE subscription_plans
SET is_active = false
WHERE name = 'Starter';

-- Add Custom plan if it doesn't exist
INSERT INTO subscription_plans (name, monthly_credits, price_monthly, price_annual, features)
VALUES (
  'Custom',
  0,
  0,
  0,
  '["Custom credit allocation", "Dedicated account manager", "Priority support", "Custom integrations", "Volume discounts", "Flexible billing"]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  features = EXCLUDED.features,
  is_active = true;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pro_credit_tiers_display_order ON pro_credit_tiers(display_order);
CREATE INDEX IF NOT EXISTS idx_pro_credit_tiers_credits ON pro_credit_tiers(credits);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);

-- Enable Row Level Security
ALTER TABLE pro_credit_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pro_credit_tiers (public read)
CREATE POLICY "Anyone can view pro credit tiers"
  ON pro_credit_tiers FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for contact_requests
CREATE POLICY "Anyone can submit contact requests"
  ON contact_requests FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Service role can view all contact requests"
  ON contact_requests FOR SELECT
  USING (true);

-- Function to update pro_credit_tiers timestamp
CREATE OR REPLACE FUNCTION update_pro_credit_tiers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
DROP TRIGGER IF EXISTS update_pro_credit_tiers_timestamp_trigger ON pro_credit_tiers;
CREATE TRIGGER update_pro_credit_tiers_timestamp_trigger
  BEFORE UPDATE ON pro_credit_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_credit_tiers_timestamp();