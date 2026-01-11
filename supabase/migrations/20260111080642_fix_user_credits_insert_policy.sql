/*
  # Fix User Credits Insert Policy for OAuth Signup

  ## Problem
  The `initialize_user_credits()` trigger was failing because the INSERT policy
  on `user_credits` requires `auth.uid() = user_id`, but during trigger execution
  from `user_profiles` insert, the auth context is not available.

  ## Solution
  - Add a service role policy to allow the trigger function to insert credits
  - The trigger function uses SECURITY DEFINER so it runs with elevated privileges
  - This allows the credits initialization to succeed during OAuth signup

  ## Security
  - Only affects trigger execution context
  - The trigger only inserts data for the newly created user profile
  - No risk of privilege escalation
*/

-- Add service role policy for user_credits inserts (needed for trigger)
CREATE POLICY "Service role can insert user credits"
  ON user_credits FOR INSERT
  TO service_role
  WITH CHECK (true);
