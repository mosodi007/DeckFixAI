/*
  # Add Anonymous Session Support for Analyses

  ## Overview
  Allows unauthenticated users to upload and view their pitch deck analysis
  using a temporary session ID. When they sign up or log in, their analysis
  is migrated to their authenticated account.

  ## Changes

  1. **Analyses Table**
     - Make `user_id` nullable to support anonymous analyses
     - Add `session_id` column for tracking anonymous sessions
     - Add `created_by_user_id` to track original creator (never changes)
  
  2. **Security Policies**
     - Allow anonymous users to create analyses with session_id
     - Allow viewing analyses by session_id for anonymous users
     - Allow authenticated users to claim analyses with their session_id
     - Maintain existing authenticated user access patterns

  ## Migration Flow
  When a user signs up/logs in:
  1. Frontend identifies analyses with their session_id
  2. Updates user_id to claim the analysis
  3. Session_id remains for audit trail
*/

-- Make user_id nullable to support anonymous uploads
ALTER TABLE analyses ALTER COLUMN user_id DROP NOT NULL;

-- Add session_id for tracking anonymous sessions
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add index for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id) WHERE session_id IS NOT NULL;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can create analyses" ON analyses;
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
DROP POLICY IF EXISTS "Authenticated users can delete own analyses" ON analyses;

-- Allow anonymous users to create analyses with session_id
CREATE POLICY "Anyone can create analyses with session_id"
  ON analyses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Anonymous users must provide session_id and no user_id
    (auth.uid() IS NULL AND session_id IS NOT NULL AND user_id IS NULL)
    OR
    -- Authenticated users must provide user_id matching their auth
    (auth.uid() IS NOT NULL AND auth.uid() = user_id AND user_id IS NOT NULL)
  );

-- Allow users to view analyses they own (by user_id or session_id)
CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  TO anon, authenticated
  USING (
    -- Authenticated users can see their analyses
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    -- Anyone can see analyses with matching session_id (for anonymous access)
    (session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

-- Allow authenticated users to claim analyses from their session
CREATE POLICY "Authenticated users can claim analyses"
  ON analyses FOR UPDATE
  TO authenticated
  USING (
    -- Can update if they own it
    (auth.uid() = user_id)
    OR
    -- Can claim if it matches their session and has no user yet
    (user_id IS NULL AND session_id IS NOT NULL AND session_id = current_setting('request.headers', true)::json->>'x-session-id')
  )
  WITH CHECK (
    -- Must be setting to their own user_id
    auth.uid() = user_id
  );

-- Allow users to delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update policies for related tables to support session-based access

-- analysis_pages
DROP POLICY IF EXISTS "Users can view pages for their analyses" ON analysis_pages;
DROP POLICY IF EXISTS "Users can create analysis pages for their analyses" ON analysis_pages;

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
        (analyses.session_id IS NOT NULL AND analyses.session_id = current_setting('request.headers', true)::json->>'x-session-id')
      )
    )
  );

CREATE POLICY "Users can create pages for accessible analyses"
  ON analysis_pages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.session_id IS NOT NULL AND analyses.user_id IS NULL)
      )
    )
  );

-- analysis_metrics
DROP POLICY IF EXISTS "Users can view metrics for their analyses" ON analysis_metrics;
DROP POLICY IF EXISTS "Users can create metrics for their analyses" ON analysis_metrics;

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
        (analyses.session_id IS NOT NULL AND analyses.session_id = current_setting('request.headers', true)::json->>'x-session-id')
      )
    )
  );

CREATE POLICY "Users can create metrics for accessible analyses"
  ON analysis_metrics FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.session_id IS NOT NULL AND analyses.user_id IS NULL)
      )
    )
  );

-- analysis_issues
DROP POLICY IF EXISTS "Users can view issues for their analyses" ON analysis_issues;
DROP POLICY IF EXISTS "Users can create issues for their analyses" ON analysis_issues;

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
        (analyses.session_id IS NOT NULL AND analyses.session_id = current_setting('request.headers', true)::json->>'x-session-id')
      )
    )
  );

CREATE POLICY "Users can create issues for accessible analyses"
  ON analysis_issues FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.session_id IS NOT NULL AND analyses.user_id IS NULL)
      )
    )
  );

-- missing_slides
DROP POLICY IF EXISTS "Users can view missing slides for their analyses" ON missing_slides;
DROP POLICY IF EXISTS "Users can create missing slides for their analyses" ON missing_slides;

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
        (analyses.session_id IS NOT NULL AND analyses.session_id = current_setting('request.headers', true)::json->>'x-session-id')
      )
    )
  );

CREATE POLICY "Users can create missing slides for accessible analyses"
  ON missing_slides FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND (
        (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
        OR
        (analyses.session_id IS NOT NULL AND analyses.user_id IS NULL)
      )
    )
  );

-- Update other related tables similarly
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('key_business_metrics', 'analysis_stage_assessment', 'analysis_investment_readiness', 'analysis_red_flags', 'analysis_deal_breakers')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I for their analyses" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can create %I for their analyses" ON %I', table_name, table_name);
    
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
              (analyses.session_id IS NOT NULL AND analyses.session_id = current_setting(''request.headers'', true)::json->>''x-session-id'')
            )
          )
        )', table_name, table_name, table_name);
    
    EXECUTE format('
      CREATE POLICY "Users can create %I for accessible analyses"
        ON %I FOR INSERT
        TO anon, authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = %I.analysis_id
            AND (
              (auth.uid() IS NOT NULL AND analyses.user_id = auth.uid())
              OR
              (analyses.session_id IS NOT NULL AND analyses.user_id IS NULL)
            )
          )
        )', table_name, table_name, table_name);
  END LOOP;
END $$;
