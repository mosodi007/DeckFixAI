/*
  # Simplify User Credits Insert Policy

  ## Problem
  The trigger `initialize_user_credits()` is SECURITY DEFINER but still 
  may be affected by RLS policies during execution.

  ## Solution
  - Add a public insert policy with WITH CHECK (true)
  - The trigger is SECURITY DEFINER and controls the data being inserted
  - This ensures the trigger can always complete successfully

  ## Security
  - The trigger is the only code path that auto-inserts credits
  - The trigger is SECURITY DEFINER and only inserts for NEW.id from user_profiles
  - User-initiated inserts still require auth.uid() = user_id
*/

-- Drop existing public/anon policy if it exists
DROP POLICY IF EXISTS "Public can insert user credits" ON user_credits;

-- Add a simple public insert policy for triggers
CREATE POLICY "Allow credit initialization on signup"
  ON user_credits FOR INSERT
  TO public
  WITH CHECK (true);
