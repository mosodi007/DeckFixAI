/*
  # Fix Anonymous Analysis Claim Policy

  ## Problem
  The claim policy was checking request headers which don't work from client-side.

  ## Solution
  Allow authenticated users to claim any anonymous analysis (session_id present, no user_id).
  This is safe because:
  1. Users can only claim analyses that aren't owned yet
  2. They can only set user_id to their own ID
  3. After claiming, standard user_id RLS applies
*/

-- Drop and recreate the claim policy
DROP POLICY IF EXISTS "Authenticated users can claim analyses" ON analyses;

CREATE POLICY "Authenticated users can claim analyses"
  ON analyses FOR UPDATE
  TO authenticated
  USING (
    -- Can update if they own it
    (auth.uid() = user_id)
    OR
    -- Can claim if it's an unclaimed anonymous analysis
    (user_id IS NULL AND session_id IS NOT NULL)
  )
  WITH CHECK (
    -- Must be setting to their own user_id
    auth.uid() = user_id
  );
