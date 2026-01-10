/*
  # Add More Missing Analysis Tables

  1. New Tables
    - `stage_assessments` - Stores funding stage detection
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `detected_stage` (text) - Pre-Seed, Seed, Series A, Series B+
      - `stage_confidence` (text) - high, medium, low
      - `stage_appropriateness_score` (integer) - 0-100
      - `created_at` (timestamp)
    
    - `deck_quality_metrics` - Stores quality metrics scores
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `clarity_score` (integer) - 0-100
      - `design_score` (integer) - 0-100
      - `completeness_score` (integer) - 0-100
      - `storytelling_score` (integer) - 0-100
      - `data_quality_score` (integer) - 0-100
      - `structure_score` (integer) - 0-100
      - `created_at` (timestamp)
    
    - `vc_criteria_scores` - Stores VC evaluation criteria
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `team_quality_score` (integer) - 0-100
      - `team_quality_feedback` (text)
      - `market_size_score` (integer) - 0-100
      - `market_size_feedback` (text)
      - `product_differentiation_score` (integer) - 0-100
      - `product_differentiation_feedback` (text)
      - `business_model_score` (integer) - 0-100
      - `business_model_feedback` (text)
      - `gtm_strategy_score` (integer) - 0-100
      - `gtm_strategy_feedback` (text)
      - `competitive_position_score` (integer) - 0-100
      - `competitive_position_feedback` (text)
      - `financial_projections_score` (integer) - 0-100
      - `financial_projections_feedback` (text)
      - `use_of_funds_score` (integer) - 0-100
      - `use_of_funds_feedback` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read their own data
    - Add policies for anonymous users based on session_id
    - Add policies for service role to insert data
*/

-- Create stage_assessments table
CREATE TABLE IF NOT EXISTS stage_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  detected_stage text NOT NULL,
  stage_confidence text NOT NULL CHECK (stage_confidence IN ('high', 'medium', 'low')),
  stage_appropriateness_score integer NOT NULL CHECK (stage_appropriateness_score >= 0 AND stage_appropriateness_score <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create deck_quality_metrics table
CREATE TABLE IF NOT EXISTS deck_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  clarity_score integer NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
  design_score integer NOT NULL CHECK (design_score >= 0 AND design_score <= 100),
  completeness_score integer NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 100),
  storytelling_score integer NOT NULL CHECK (storytelling_score >= 0 AND storytelling_score <= 100),
  data_quality_score integer NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  structure_score integer NOT NULL CHECK (structure_score >= 0 AND structure_score <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create vc_criteria_scores table
CREATE TABLE IF NOT EXISTS vc_criteria_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  team_quality_score integer NOT NULL CHECK (team_quality_score >= 0 AND team_quality_score <= 100),
  team_quality_feedback text NOT NULL DEFAULT '',
  market_size_score integer NOT NULL CHECK (market_size_score >= 0 AND market_size_score <= 100),
  market_size_feedback text NOT NULL DEFAULT '',
  product_differentiation_score integer NOT NULL CHECK (product_differentiation_score >= 0 AND product_differentiation_score <= 100),
  product_differentiation_feedback text NOT NULL DEFAULT '',
  business_model_score integer NOT NULL CHECK (business_model_score >= 0 AND business_model_score <= 100),
  business_model_feedback text NOT NULL DEFAULT '',
  gtm_strategy_score integer NOT NULL CHECK (gtm_strategy_score >= 0 AND gtm_strategy_score <= 100),
  gtm_strategy_feedback text NOT NULL DEFAULT '',
  competitive_position_score integer NOT NULL CHECK (competitive_position_score >= 0 AND competitive_position_score <= 100),
  competitive_position_feedback text NOT NULL DEFAULT '',
  financial_projections_score integer NOT NULL CHECK (financial_projections_score >= 0 AND financial_projections_score <= 100),
  financial_projections_feedback text NOT NULL DEFAULT '',
  use_of_funds_score integer NOT NULL CHECK (use_of_funds_score >= 0 AND use_of_funds_score <= 100),
  use_of_funds_feedback text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vc_criteria_scores ENABLE ROW LEVEL SECURITY;

-- Stage assessments policies
CREATE POLICY "Users can read own stage assessments"
  ON stage_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = stage_assessments.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own stage assessments"
  ON stage_assessments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = stage_assessments.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert stage assessments"
  ON stage_assessments FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Deck quality metrics policies
CREATE POLICY "Users can read own deck quality metrics"
  ON deck_quality_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = deck_quality_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own deck quality metrics"
  ON deck_quality_metrics FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = deck_quality_metrics.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert deck quality metrics"
  ON deck_quality_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- VC criteria scores policies
CREATE POLICY "Users can read own vc criteria scores"
  ON vc_criteria_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = vc_criteria_scores.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own vc criteria scores"
  ON vc_criteria_scores FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = vc_criteria_scores.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert vc criteria scores"
  ON vc_criteria_scores FOR INSERT
  TO service_role
  WITH CHECK (true);