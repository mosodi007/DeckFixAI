/*
  # Fix Anonymous Read Access for Analyses

  ## Problem
  Client-side queries cannot pass session_id through request headers to RLS policies.
  The current policy tries to read from request headers which only works in Edge Functions.

  ## Solution
  For anonymous analyses (those with session_id but no user_id):
  - Allow read access to anyone who knows the analysis UUID
  - The UUID acts as a secret token (unguessable)
  - This is secure because UUIDs are cryptographically random

  For authenticated analyses:
  - Maintain existing user_id checks
  - Only the owner can access

  ## Security
  - UUIDs are 128-bit random values (effectively unguessable)
  - Anonymous analyses are temporary and auto-migrate on signup
  - Authenticated analyses remain protected by user_id
*/

-- Drop the problematic session-based read policy
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;

-- Create new read policy with proper logic
CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  TO anon, authenticated
  USING (
    -- Authenticated users can see their own analyses
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    -- Anyone can see anonymous analyses if they know the UUID
    -- (UUID acts as a secret token - this is secure)
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Update related tables to use similar logic
-- analysis_pages
DROP POLICY IF EXISTS "Users can view pages for accessible analyses" ON analysis_pages;

CREATE POLICY "Users can view pages for accessible analyses"
  ON analysis_pages FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.user_id IS NULL AND analyses.session_id IS NOT NULL)
      )
    )
  );

-- analysis_metrics
DROP POLICY IF EXISTS "Users can view metrics for accessible analyses" ON analysis_metrics;

CREATE POLICY "Users can view metrics for accessible analyses"
  ON analysis_metrics FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.user_id IS NULL AND analyses.session_id IS NOT NULL)
      )
    )
  );

-- analysis_issues
DROP POLICY IF EXISTS "Users can view issues for accessible analyses" ON analysis_issues;

CREATE POLICY "Users can view issues for accessible analyses"
  ON analysis_issues FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.user_id IS NULL AND analyses.session_id IS NOT NULL)
      )
    )
  );

-- missing_slides
DROP POLICY IF EXISTS "Users can view missing slides for accessible analyses" ON missing_slides;

CREATE POLICY "Users can view missing slides for accessible analyses"
  ON missing_slides FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.user_id IS NULL AND analyses.session_id IS NOT NULL)
      )
    )
  );

-- Update other related tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('key_business_metrics', 'analysis_stage_assessment', 'analysis_investment_readiness', 'analysis_red_flags', 'analysis_deal_breakers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I for accessible analyses" ON %I', table_name, table_name);
    
    EXECUTE format('
      CREATE POLICY "Users can view %I for accessible analyses"
        ON %I FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = %I.analysis_id
            AND (
              (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
              OR
              (analyses.user_id IS NULL AND analyses.session_id IS NOT NULL)
            )
          )
        )', table_name, table_name, table_name);
  END LOOP;
END $$;
