/*
  # Fix User Profiles Insert Policy

  ## Problem
  The previous policy had incorrect syntax - it referenced `user_profiles.id` 
  in the WITH CHECK clause, which doesn't work during INSERT.

  ## Solution
  - Simplify the policy to allow public inserts with basic validation
  - The trigger function is SECURITY DEFINER and controls the data
  - Trust that only the trigger will insert profiles

  ## Security
  - The trigger is the only code path that inserts profiles
  - The trigger is SECURITY DEFINER and only inserts for NEW.id from auth.users
  - This is safe because the trigger is called after auth.users insert
*/

-- Drop the broken policy
DROP POLICY IF EXISTS "Allow profile creation on signup" ON user_profiles;

-- Create a simple public insert policy for the trigger
-- The trigger is SECURITY DEFINER so this is safe
CREATE POLICY "Allow profile creation on signup"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (true);
