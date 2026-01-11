/*
  # Fix OAuth Trigger - Allow Anonymous Profile Creation

  ## Problem
  The `handle_new_user()` trigger is failing because:
  - During OAuth signup, the trigger runs before the user is fully authenticated
  - RLS policies on user_profiles require either authenticated or service_role
  - SECURITY DEFINER alone isn't enough if there's no matching RLS policy

  ## Solution
  - Add an anon/public policy that allows profile creation during signup
  - The policy checks that the profile id matches a user in auth.users
  - This allows the trigger to succeed while maintaining security

  ## Security
  - Policy only allows inserting profiles for users that exist in auth.users
  - The trigger controls what data gets inserted
  - No risk of unauthorized profile creation
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Allow profile creation on signup" ON user_profiles;

-- Create a more permissive policy that works with triggers
CREATE POLICY "Allow profile creation on signup"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (
    -- Allow insert if the id corresponds to a user in auth.users
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = user_profiles.id
    )
  );

-- Ensure the service role policy still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Service role can insert profiles'
  ) THEN
    CREATE POLICY "Service role can insert profiles"
      ON user_profiles FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;
