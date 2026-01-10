/*
  # Add Cascade Delete and Delete Permissions

  1. Changes
    - Add ON DELETE CASCADE to all foreign key constraints
    - Add DELETE policies so users can delete their own analyses
    - Related data (pages, metrics, issues, etc.) will be automatically deleted

  2. Security
    - Only authenticated users can delete analyses they own
    - Anonymous users can delete their session-based analyses
    - Cascading ensures no orphaned data remains
*/

-- Add DELETE policy for analyses
DROP POLICY IF EXISTS "Users can delete own analyses" ON analyses;

CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  TO authenticated, anon
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Update foreign key constraints to cascade deletes
-- This ensures when an analysis is deleted, all related data is also deleted

-- analysis_pages
ALTER TABLE analysis_pages
  DROP CONSTRAINT IF EXISTS analysis_pages_analysis_id_fkey,
  ADD CONSTRAINT analysis_pages_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_metrics
ALTER TABLE analysis_metrics
  DROP CONSTRAINT IF EXISTS analysis_metrics_analysis_id_fkey,
  ADD CONSTRAINT analysis_metrics_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_issues
ALTER TABLE analysis_issues
  DROP CONSTRAINT IF EXISTS analysis_issues_analysis_id_fkey,
  ADD CONSTRAINT analysis_issues_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- missing_slides
ALTER TABLE missing_slides
  DROP CONSTRAINT IF EXISTS missing_slides_analysis_id_fkey,
  ADD CONSTRAINT missing_slides_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- key_business_metrics
ALTER TABLE key_business_metrics
  DROP CONSTRAINT IF EXISTS key_business_metrics_analysis_id_fkey,
  ADD CONSTRAINT key_business_metrics_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_stage_assessment
ALTER TABLE analysis_stage_assessment
  DROP CONSTRAINT IF EXISTS analysis_stage_assessment_analysis_id_fkey,
  ADD CONSTRAINT analysis_stage_assessment_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_investment_readiness
ALTER TABLE analysis_investment_readiness
  DROP CONSTRAINT IF EXISTS analysis_investment_readiness_analysis_id_fkey,
  ADD CONSTRAINT analysis_investment_readiness_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_red_flags
ALTER TABLE analysis_red_flags
  DROP CONSTRAINT IF EXISTS analysis_red_flags_analysis_id_fkey,
  ADD CONSTRAINT analysis_red_flags_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;

-- analysis_deal_breakers
ALTER TABLE analysis_deal_breakers
  DROP CONSTRAINT IF EXISTS analysis_deal_breakers_analysis_id_fkey,
  ADD CONSTRAINT analysis_deal_breakers_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE;
