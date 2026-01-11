/*
  # Create Tier Upgrade Pricing System

  1. New Tables
    - `tier_upgrade_pricing`
      - `id` (uuid, primary key)
      - `from_tier_credits` (integer) - Starting tier credit amount
      - `to_tier_credits` (integer) - Target tier credit amount
      - `upgrade_cost_monthly` (numeric) - Monthly upgrade cost in USD
      - `upgrade_cost_annual` (numeric) - Annual upgrade cost in USD
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (from_tier_credits, to_tier_credits)

  2. Functions
    - `get_upgrade_cost` - Calculate upgrade cost between two tiers
    - `calculate_prorated_upgrade` - Calculate prorated amount based on billing cycle

  3. Security
    - Enable RLS on tier_upgrade_pricing
    - Allow authenticated users to read upgrade pricing

  4. Seed Data
    Monthly upgrade pricing:
    - 500 to 1,000: $8.00
    - 500 to 2,000: $24.00
    - 500 to 5,000: $65.00
    - 500 to 10,000: $130.00
    - 1,000 to 2,000: $16.00
    - 1,000 to 5,000: $57.00
    - 1,000 to 10,000: $122.00
    - 2,000 to 5,000: $41.00
    - 2,000 to 10,000: $106.00
    - 5,000 to 10,000: $65.00

    Annual upgrade pricing (20% discount):
    - 500 to 1,000: $76.80
    - 500 to 2,000: $230.40
    - 500 to 5,000: $624.00
    - 500 to 10,000: $1,248.00
    - 1,000 to 2,000: $153.60
    - 1,000 to 5,000: $547.20
    - 1,000 to 10,000: $1,171.20
    - 2,000 to 5,000: $393.60
    - 2,000 to 10,000: $1,017.60
    - 5,000 to 10,000: $624.00
*/

-- Create tier_upgrade_pricing table
CREATE TABLE IF NOT EXISTS tier_upgrade_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tier_credits integer NOT NULL,
  to_tier_credits integer NOT NULL,
  upgrade_cost_monthly numeric(10, 2) NOT NULL,
  upgrade_cost_annual numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tier_upgrade_unique UNIQUE (from_tier_credits, to_tier_credits),
  CONSTRAINT valid_upgrade CHECK (to_tier_credits > from_tier_credits)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tier_upgrade_from_to ON tier_upgrade_pricing(from_tier_credits, to_tier_credits);

-- Enable Row Level Security
ALTER TABLE tier_upgrade_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view upgrade pricing
CREATE POLICY "Anyone can view upgrade pricing"
  ON tier_upgrade_pricing FOR SELECT
  TO authenticated, anon
  USING (true);

-- Insert monthly upgrade pricing data
INSERT INTO tier_upgrade_pricing (from_tier_credits, to_tier_credits, upgrade_cost_monthly, upgrade_cost_annual)
VALUES
  -- From 500 credits
  (500, 1000, 8.00, 76.80),
  (500, 2000, 24.00, 230.40),
  (500, 5000, 65.00, 624.00),
  (500, 10000, 130.00, 1248.00),
  -- From 1,000 credits
  (1000, 2000, 16.00, 153.60),
  (1000, 5000, 57.00, 547.20),
  (1000, 10000, 122.00, 1171.20),
  -- From 2,000 credits
  (2000, 5000, 41.00, 393.60),
  (2000, 10000, 106.00, 1017.60),
  -- From 5,000 credits
  (5000, 10000, 65.00, 624.00)
ON CONFLICT (from_tier_credits, to_tier_credits) DO UPDATE SET
  upgrade_cost_monthly = EXCLUDED.upgrade_cost_monthly,
  upgrade_cost_annual = EXCLUDED.upgrade_cost_annual,
  updated_at = now();

-- Function: Get upgrade cost between two tiers
CREATE OR REPLACE FUNCTION get_upgrade_cost(
  p_from_credits integer,
  p_to_credits integer,
  p_billing_period text
)
RETURNS numeric AS $$
DECLARE
  v_cost numeric;
BEGIN
  -- Return null for downgrades or same tier
  IF p_to_credits <= p_from_credits THEN
    RETURN NULL;
  END IF;

  -- Look up the upgrade cost
  IF p_billing_period = 'annual' THEN
    SELECT upgrade_cost_annual INTO v_cost
    FROM tier_upgrade_pricing
    WHERE from_tier_credits = p_from_credits
      AND to_tier_credits = p_to_credits;
  ELSE
    SELECT upgrade_cost_monthly INTO v_cost
    FROM tier_upgrade_pricing
    WHERE from_tier_credits = p_from_credits
      AND to_tier_credits = p_to_credits;
  END IF;

  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate prorated upgrade cost
CREATE OR REPLACE FUNCTION calculate_prorated_upgrade(
  p_upgrade_cost numeric,
  p_days_remaining integer,
  p_total_days integer
)
RETURNS numeric AS $$
BEGIN
  -- If no days remaining or invalid input, return full cost
  IF p_days_remaining <= 0 OR p_total_days <= 0 THEN
    RETURN p_upgrade_cost;
  END IF;

  -- Calculate prorated amount based on remaining days
  RETURN ROUND(p_upgrade_cost * (p_days_remaining::numeric / p_total_days::numeric), 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update tier_upgrade_pricing timestamp
CREATE OR REPLACE FUNCTION update_tier_upgrade_pricing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
DROP TRIGGER IF EXISTS update_tier_upgrade_pricing_timestamp_trigger ON tier_upgrade_pricing;
CREATE TRIGGER update_tier_upgrade_pricing_timestamp_trigger
  BEFORE UPDATE ON tier_upgrade_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_upgrade_pricing_timestamp();
