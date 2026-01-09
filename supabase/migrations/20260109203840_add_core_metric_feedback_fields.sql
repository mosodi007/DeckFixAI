/*
  # Add Core Metric Feedback Fields

  1. Changes
    - Add `overall_score_feedback` column to `analyses` table
    - Add `investment_grade_feedback` column to `analyses` table
    - Add `funding_odds_feedback` column to `analyses` table

  2. Notes
    - These fields store detailed explanations for the top-row summary metrics
    - Allows users to click "Show details" on Overall Score, Investment Grade, and Funding Odds cards
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'overall_score_feedback'
  ) THEN
    ALTER TABLE analyses ADD COLUMN overall_score_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'investment_grade_feedback'
  ) THEN
    ALTER TABLE analyses ADD COLUMN investment_grade_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'funding_odds_feedback'
  ) THEN
    ALTER TABLE analyses ADD COLUMN funding_odds_feedback text;
  END IF;
END $$;