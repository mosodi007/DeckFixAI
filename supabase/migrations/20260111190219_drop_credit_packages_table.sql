/*
  # Drop Credit Packages Table

  Removes the credit_packages table since we're only using subscription tiers (pro_credit_tiers).
  One-time credit purchases are no longer supported - all credits come from subscriptions.
*/

-- Drop RLS policy first
DROP POLICY IF EXISTS "Anyone can view credit packages" ON credit_packages;

-- Drop the table
DROP TABLE IF EXISTS credit_packages;

