/*
  # Fix RLS Policies for Proper Data Isolation

  1. Problem
    - Current RLS policies allow ANY anonymous user to see ALL anonymous analyses
    - Policy: `((user_id IS NULL) AND (session_id IS NOT NULL))` is insecure
    - session_id is client-side only and can't be validated in RLS policies

  2. Solution
    - Use Supabase's anonymous authentication (auth.uid() for anonymous users)
    - All users (anonymous and authenticated) now have a real auth.uid()
    - RLS policies check auth.uid() = user_id consistently
    - Proper data isolation for all users

  3. Security Impact
    - Anonymous users can ONLY see their own data
    - Authenticated users can ONLY see their own data
    - No cross-user data leakage
*/

-- Fix analyses table policies
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
DROP POLICY IF EXISTS "Anyone can create analyses with session_id" ON analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON analyses;
DROP POLICY IF EXISTS "Authenticated users can claim analyses" ON analyses;
DROP POLICY IF EXISTS "Authenticated users can update own analyses" ON analyses;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  TO authenticated, anon
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
  ON analyses FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  TO authenticated, anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  TO authenticated, anon
  USING (auth.uid() = user_id);

-- Fix analysis_pages table policies
DROP POLICY IF EXISTS "Users can view pages of own analyses" ON analysis_pages;
DROP POLICY IF EXISTS "Users can insert pages for own analyses" ON analysis_pages;
DROP POLICY IF EXISTS "Users can update pages of own analyses" ON analysis_pages;
DROP POLICY IF EXISTS "Users can delete pages of own analyses" ON analysis_pages;

CREATE POLICY "Users can view pages of own analyses"
  ON analysis_pages FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages for own analyses"
  ON analysis_pages FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages of own analyses"
  ON analysis_pages FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages of own analyses"
  ON analysis_pages FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_metrics table policies
DROP POLICY IF EXISTS "Users can view metrics for own analyses" ON analysis_metrics;
DROP POLICY IF EXISTS "Users can insert metrics for own analyses" ON analysis_metrics;
DROP POLICY IF EXISTS "Users can update metrics for own analyses" ON analysis_metrics;
DROP POLICY IF EXISTS "Users can delete metrics for own analyses" ON analysis_metrics;

CREATE POLICY "Users can view metrics for own analyses"
  ON analysis_metrics FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for own analyses"
  ON analysis_metrics FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for own analyses"
  ON analysis_metrics FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete metrics for own analyses"
  ON analysis_metrics FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_issues table policies
DROP POLICY IF EXISTS "Users can view issues for own analyses" ON analysis_issues;
DROP POLICY IF EXISTS "Users can insert issues for own analyses" ON analysis_issues;
DROP POLICY IF EXISTS "Users can update issues for own analyses" ON analysis_issues;
DROP POLICY IF EXISTS "Users can delete issues for own analyses" ON analysis_issues;

CREATE POLICY "Users can view issues for own analyses"
  ON analysis_issues FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert issues for own analyses"
  ON analysis_issues FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update issues for own analyses"
  ON analysis_issues FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete issues for own analyses"
  ON analysis_issues FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix missing_slides table policies
DROP POLICY IF EXISTS "Users can view missing slides for own analyses" ON missing_slides;
DROP POLICY IF EXISTS "Users can insert missing slides for own analyses" ON missing_slides;
DROP POLICY IF EXISTS "Users can update missing slides for own analyses" ON missing_slides;
DROP POLICY IF EXISTS "Users can delete missing slides for own analyses" ON missing_slides;

CREATE POLICY "Users can view missing slides for own analyses"
  ON missing_slides FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert missing slides for own analyses"
  ON missing_slides FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update missing slides for own analyses"
  ON missing_slides FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete missing slides for own analyses"
  ON missing_slides FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix key_business_metrics table policies
DROP POLICY IF EXISTS "Users can view key metrics for own analyses" ON key_business_metrics;
DROP POLICY IF EXISTS "Users can insert key metrics for own analyses" ON key_business_metrics;
DROP POLICY IF EXISTS "Users can update key metrics for own analyses" ON key_business_metrics;
DROP POLICY IF EXISTS "Users can delete key metrics for own analyses" ON key_business_metrics;

CREATE POLICY "Users can view key metrics for own analyses"
  ON key_business_metrics FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_business_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert key metrics for own analyses"
  ON key_business_metrics FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_business_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update key metrics for own analyses"
  ON key_business_metrics FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_business_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_business_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete key metrics for own analyses"
  ON key_business_metrics FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_business_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_stage_assessment table policies
DROP POLICY IF EXISTS "Users can view stage assessment for own analyses" ON analysis_stage_assessment;
DROP POLICY IF EXISTS "Users can insert stage assessment for own analyses" ON analysis_stage_assessment;
DROP POLICY IF EXISTS "Users can update stage assessment for own analyses" ON analysis_stage_assessment;
DROP POLICY IF EXISTS "Users can delete stage assessment for own analyses" ON analysis_stage_assessment;

CREATE POLICY "Users can view stage assessment for own analyses"
  ON analysis_stage_assessment FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_stage_assessment.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stage assessment for own analyses"
  ON analysis_stage_assessment FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_stage_assessment.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stage assessment for own analyses"
  ON analysis_stage_assessment FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_stage_assessment.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_stage_assessment.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stage assessment for own analyses"
  ON analysis_stage_assessment FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_stage_assessment.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_investment_readiness table policies
DROP POLICY IF EXISTS "Users can view investment readiness for own analyses" ON analysis_investment_readiness;
DROP POLICY IF EXISTS "Users can insert investment readiness for own analyses" ON analysis_investment_readiness;
DROP POLICY IF EXISTS "Users can update investment readiness for own analyses" ON analysis_investment_readiness;
DROP POLICY IF EXISTS "Users can delete investment readiness for own analyses" ON analysis_investment_readiness;

CREATE POLICY "Users can view investment readiness for own analyses"
  ON analysis_investment_readiness FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_investment_readiness.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert investment readiness for own analyses"
  ON analysis_investment_readiness FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_investment_readiness.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update investment readiness for own analyses"
  ON analysis_investment_readiness FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_investment_readiness.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_investment_readiness.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete investment readiness for own analyses"
  ON analysis_investment_readiness FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_investment_readiness.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_red_flags table policies
DROP POLICY IF EXISTS "Users can view red flags for own analyses" ON analysis_red_flags;
DROP POLICY IF EXISTS "Users can insert red flags for own analyses" ON analysis_red_flags;
DROP POLICY IF EXISTS "Users can update red flags for own analyses" ON analysis_red_flags;
DROP POLICY IF EXISTS "Users can delete red flags for own analyses" ON analysis_red_flags;

CREATE POLICY "Users can view red flags for own analyses"
  ON analysis_red_flags FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_red_flags.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert red flags for own analyses"
  ON analysis_red_flags FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_red_flags.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update red flags for own analyses"
  ON analysis_red_flags FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_red_flags.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_red_flags.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete red flags for own analyses"
  ON analysis_red_flags FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_red_flags.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_deal_breakers table policies
DROP POLICY IF EXISTS "Users can view deal breakers for own analyses" ON analysis_deal_breakers;
DROP POLICY IF EXISTS "Users can insert deal breakers for own analyses" ON analysis_deal_breakers;
DROP POLICY IF EXISTS "Users can update deal breakers for own analyses" ON analysis_deal_breakers;
DROP POLICY IF EXISTS "Users can delete deal breakers for own analyses" ON analysis_deal_breakers;

CREATE POLICY "Users can view deal breakers for own analyses"
  ON analysis_deal_breakers FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deal breakers for own analyses"
  ON analysis_deal_breakers FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deal breakers for own analyses"
  ON analysis_deal_breakers FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deal breakers for own analyses"
  ON analysis_deal_breakers FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

-- Fix analysis_slide_fixes table policies
DROP POLICY IF EXISTS "Users can view slide fixes for own analyses" ON analysis_slide_fixes;
DROP POLICY IF EXISTS "Users can insert slide fixes for own analyses" ON analysis_slide_fixes;
DROP POLICY IF EXISTS "Users can update slide fixes for own analyses" ON analysis_slide_fixes;
DROP POLICY IF EXISTS "Users can delete slide fixes for own analyses" ON analysis_slide_fixes;

CREATE POLICY "Users can view slide fixes for own analyses"
  ON analysis_slide_fixes FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert slide fixes for own analyses"
  ON analysis_slide_fixes FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update slide fixes for own analyses"
  ON analysis_slide_fixes FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete slide fixes for own analyses"
  ON analysis_slide_fixes FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );
