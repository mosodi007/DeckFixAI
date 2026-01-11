/*
  # Fix Subscription Plans RLS Policies

  The subscription_plans table exists but RLS policies were blocking access
  during OAuth signup. Adding comprehensive policies to allow proper access.

  1. Security Updates
    - Add policy for authenticated users to read all subscription plans
    - Add policy for service role to read all subscription plans
    - Keep existing public policy for unauthenticated access
*/

-- Drop existing policy and recreate with better coverage
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;

-- Allow unauthenticated users to view active plans
CREATE POLICY "Public can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow authenticated users to view all plans
CREATE POLICY "Authenticated users can view all subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Service role has full access to subscription plans"
  ON subscription_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
