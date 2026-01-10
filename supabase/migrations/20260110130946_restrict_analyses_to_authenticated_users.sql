/*
  # Restrict Analyses to Authenticated Users Only

  ## Overview
  Removes public access to analyses and requires authentication for all operations.
  Ensures pitch decks are only accessible to the user who uploaded them.

  ## Security Changes

  1. **Analyses Table**
     - Remove all public/temporary analysis policies
     - Only authenticated users can create analyses linked to their user_id
     - Users can only view, update, and delete their own analyses

  2. **Related Tables (analysis_pages, analysis_metrics, analysis_issues, missing_slides, slide_fixes)**
     - Remove public access policies
     - Access only through authenticated user's analyses

  ## Impact
  - Unauthenticated users can no longer create or view analyses
  - All pitch deck data is private to the user who uploaded it
  - Users must sign up/login before uploading decks
*/

-- Drop all public policies on analyses table
DROP POLICY IF EXISTS "Public can view recent analyses" ON analyses;
DROP POLICY IF EXISTS "Public can create temporary analyses" ON analyses;

-- Ensure only authenticated users can insert analyses with their user_id
DROP POLICY IF EXISTS "Authenticated users can create analyses" ON analyses;
CREATE POLICY "Authenticated users can create analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- Allow authenticated users to delete their own analyses
DROP POLICY IF EXISTS "Authenticated users can delete own analyses" ON analyses;
CREATE POLICY "Authenticated users can delete own analyses"
  ON analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update analysis_pages policies - remove public access
DROP POLICY IF EXISTS "Public can view analysis pages for temporary analyses" ON analysis_pages;
DROP POLICY IF EXISTS "Users can create analysis pages for their analyses" ON analysis_pages;

CREATE POLICY "Users can create analysis pages for their analyses"
  ON analysis_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Update analysis_metrics policies - remove public access
DROP POLICY IF EXISTS "Public can view metrics for temporary analyses" ON analysis_metrics;
DROP POLICY IF EXISTS "Users can create metrics for analyses" ON analysis_metrics;

CREATE POLICY "Users can create metrics for their analyses"
  ON analysis_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Update analysis_issues policies - remove public access
DROP POLICY IF EXISTS "Public can view issues for temporary analyses" ON analysis_issues;
DROP POLICY IF EXISTS "Users can create issues for analyses" ON analysis_issues;

CREATE POLICY "Users can create issues for their analyses"
  ON analysis_issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Update missing_slides policies - remove public access
DROP POLICY IF EXISTS "Public can view missing slides for temporary analyses" ON missing_slides;
DROP POLICY IF EXISTS "Users can create missing slides for analyses" ON missing_slides;

CREATE POLICY "Users can create missing slides for their analyses"
  ON missing_slides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Update slide_fixes policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'slide_fixes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view fixes for their analyses" ON slide_fixes';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create fixes for their analyses" ON slide_fixes';
    
    EXECUTE 'CREATE POLICY "Users can view fixes for their analyses"
      ON slide_fixes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM analyses
          WHERE analyses.id = slide_fixes.analysis_id
          AND analyses.user_id = auth.uid()
        )
      )';
    
    EXECUTE 'CREATE POLICY "Users can create fixes for their analyses"
      ON slide_fixes FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM analyses
          WHERE analyses.id = slide_fixes.analysis_id
          AND analyses.user_id = auth.uid()
        )
      )';
  END IF;
END $$;
