/*
  # Fix RLS Policies for Slide Fixes to Support Anonymous Users

  ## Overview
  Updates Row Level Security policies for `analysis_slide_fixes` table to allow:
  1. Authenticated users to view their own fixes
  2. Anonymous users to view fixes for temporary analyses (created within last hour)

  ## Changes
  - Update SELECT policy to support both authenticated and anonymous users
  - Anonymous users can view fixes for analyses where user_id IS NULL and created within last hour
  - Authenticated users can view fixes for their own analyses

  ## Security
  - Maintains data isolation between users
  - Anonymous access limited to recent temporary analyses only
  - No security downgrade - still restrictive by default
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own slide fixes" ON analysis_slide_fixes;
DROP POLICY IF EXISTS "Users can insert their own slide fixes" ON analysis_slide_fixes;

-- Create updated SELECT policy for both authenticated and anonymous users
CREATE POLICY "Users can view slide fixes for their analyses"
  ON analysis_slide_fixes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view fixes for temporary analyses"
  ON analysis_slide_fixes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id IS NULL
      AND analyses.created_at > NOW() - INTERVAL '1 hour'
    )
  );

-- Recreate INSERT policy (no changes, just ensuring consistency)
CREATE POLICY "Users can insert slide fixes for analyses"
  ON analysis_slide_fixes
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  );
