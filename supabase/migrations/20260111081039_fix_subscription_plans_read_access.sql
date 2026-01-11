/*
  # Fix Subscription Plans Read Access for Triggers

  ## Problem
  The `initialize_user_credits()` trigger function needs to read from 
  subscription_plans table, but RLS policies might block this during trigger execution.

  ## Solution
  - Add a public SELECT policy for subscription_plans
  - This allows the trigger to read plan data during user creation
  - Only active plans are visible

  ## Security
  - Read-only access to active subscription plans
  - This data is meant to be publicly visible anyway (pricing page)
  - No security risk
*/

-- Add public read access to subscription_plans for triggers
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;

CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans FOR SELECT
  TO public
  USING (is_active = true);
