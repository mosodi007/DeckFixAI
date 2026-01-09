/*
  # Add Detailed Feedback for VC Evaluation Criteria

  ## Overview
  Adds feedback columns to the analysis_investment_readiness table for each VC evaluation criterion.

  ## Table Modifications

  ### `analysis_investment_readiness`
  Adds detailed feedback fields for each VC evaluation criterion:
  - `team_feedback` (text) - Detailed feedback on team strength assessment
  - `market_opportunity_feedback` (text) - Detailed feedback on market opportunity
  - `product_feedback` (text) - Detailed feedback on product quality
  - `traction_feedback` (text) - Detailed feedback on traction and validation
  - `financials_feedback` (text) - Detailed feedback on financial strength

  ## Purpose
  These fields provide investors with detailed explanations for each criterion score,
  enabling them to understand the specific strengths and weaknesses in each area.
*/

-- Add feedback columns to analysis_investment_readiness table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_investment_readiness' AND column_name = 'team_feedback'
  ) THEN
    ALTER TABLE analysis_investment_readiness ADD COLUMN team_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_investment_readiness' AND column_name = 'market_opportunity_feedback'
  ) THEN
    ALTER TABLE analysis_investment_readiness ADD COLUMN market_opportunity_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_investment_readiness' AND column_name = 'product_feedback'
  ) THEN
    ALTER TABLE analysis_investment_readiness ADD COLUMN product_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_investment_readiness' AND column_name = 'traction_feedback'
  ) THEN
    ALTER TABLE analysis_investment_readiness ADD COLUMN traction_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_investment_readiness' AND column_name = 'financials_feedback'
  ) THEN
    ALTER TABLE analysis_investment_readiness ADD COLUMN financials_feedback text;
  END IF;
END $$;
