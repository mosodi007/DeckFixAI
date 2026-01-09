/*
  # Enhance Analysis with VC-Specific Criteria

  ## Overview
  Adds tables and fields to support stage-aware VC analysis, red flag detection,
  deal-breakers, and investment readiness assessment.

  ## New Tables

  ### `analysis_red_flags`
  Stores critical red flags identified during analysis that could prevent funding.
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key to analyses)
  - `category` (text) - Category: 'financial', 'team', 'market', 'product', 'competition', 'traction'
  - `severity` (text) - 'critical', 'major', 'moderate'
  - `title` (text) - Red flag title
  - `description` (text) - Detailed explanation
  - `impact` (text) - Impact on funding prospects

  ### `analysis_deal_breakers`
  Identifies absolute deal-breakers that make the deck not investment-ready.
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key to analyses)
  - `title` (text) - Deal-breaker title
  - `description` (text) - Why this is a deal-breaker
  - `recommendation` (text) - What needs to be fixed

  ### `analysis_stage_assessment`
  Stores funding stage detection and stage-specific evaluation.
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key to analyses)
  - `detected_stage` (text) - Detected funding stage
  - `stage_confidence` (text) - Confidence level: 'high', 'medium', 'low'
  - `stage_appropriateness_score` (integer) - How well deck matches stage expectations (0-100)
  - `stage_specific_feedback` (text) - Stage-specific recommendations

  ### `analysis_investment_readiness`
  Overall investment readiness assessment with detailed breakdown.
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key to analyses)
  - `is_investment_ready` (boolean) - Overall readiness verdict
  - `readiness_score` (integer) - Investment readiness score (0-100)
  - `readiness_summary` (text) - Executive summary of readiness
  - `critical_blockers` (text[]) - Array of critical issues blocking funding
  - `team_score` (integer) - Team assessment score (0-100)
  - `market_opportunity_score` (integer) - Market opportunity score (0-100)
  - `product_score` (integer) - Product/solution score (0-100)
  - `traction_score` (integer) - Traction/validation score (0-100)
  - `financials_score` (integer) - Financial projections quality (0-100)

  ## Table Modifications

  Add funding stage and enhanced verdict to analyses table.

  ## Security
  - Enable RLS on all new tables
  - Public read access for demo purposes
*/

-- Add funding stage column to analyses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'funding_stage'
  ) THEN
    ALTER TABLE analyses ADD COLUMN funding_stage text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'investment_ready'
  ) THEN
    ALTER TABLE analyses ADD COLUMN investment_ready boolean DEFAULT false;
  END IF;
END $$;

-- Create analysis_red_flags table
CREATE TABLE IF NOT EXISTS analysis_red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('financial', 'team', 'market', 'product', 'competition', 'traction', 'other')),
  severity text NOT NULL CHECK (severity IN ('critical', 'major', 'moderate')),
  title text NOT NULL,
  description text NOT NULL,
  impact text NOT NULL
);

ALTER TABLE analysis_red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view red flags"
  ON analysis_red_flags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create red flags"
  ON analysis_red_flags FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_deal_breakers table
CREATE TABLE IF NOT EXISTS analysis_deal_breakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  recommendation text NOT NULL
);

ALTER TABLE analysis_deal_breakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deal breakers"
  ON analysis_deal_breakers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create deal breakers"
  ON analysis_deal_breakers FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_stage_assessment table
CREATE TABLE IF NOT EXISTS analysis_stage_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  detected_stage text NOT NULL,
  stage_confidence text NOT NULL CHECK (stage_confidence IN ('high', 'medium', 'low')),
  stage_appropriateness_score integer NOT NULL CHECK (stage_appropriateness_score >= 0 AND stage_appropriateness_score <= 100),
  stage_specific_feedback text NOT NULL,
  UNIQUE(analysis_id)
);

ALTER TABLE analysis_stage_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stage assessment"
  ON analysis_stage_assessment FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create stage assessment"
  ON analysis_stage_assessment FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_investment_readiness table
CREATE TABLE IF NOT EXISTS analysis_investment_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  is_investment_ready boolean NOT NULL DEFAULT false,
  readiness_score integer NOT NULL CHECK (readiness_score >= 0 AND readiness_score <= 100),
  readiness_summary text NOT NULL,
  critical_blockers text[] NOT NULL DEFAULT '{}',
  team_score integer NOT NULL CHECK (team_score >= 0 AND team_score <= 100),
  market_opportunity_score integer NOT NULL CHECK (market_opportunity_score >= 0 AND market_opportunity_score <= 100),
  product_score integer NOT NULL CHECK (product_score >= 0 AND product_score <= 100),
  traction_score integer NOT NULL CHECK (traction_score >= 0 AND traction_score <= 100),
  financials_score integer NOT NULL CHECK (financials_score >= 0 AND financials_score <= 100),
  UNIQUE(analysis_id)
);

ALTER TABLE analysis_investment_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view investment readiness"
  ON analysis_investment_readiness FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create investment readiness"
  ON analysis_investment_readiness FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_red_flags_analysis_id ON analysis_red_flags(analysis_id);
CREATE INDEX IF NOT EXISTS idx_red_flags_severity ON analysis_red_flags(severity);
CREATE INDEX IF NOT EXISTS idx_deal_breakers_analysis_id ON analysis_deal_breakers(analysis_id);
CREATE INDEX IF NOT EXISTS idx_stage_assessment_analysis_id ON analysis_stage_assessment(analysis_id);
CREATE INDEX IF NOT EXISTS idx_investment_readiness_analysis_id ON analysis_investment_readiness(analysis_id);
