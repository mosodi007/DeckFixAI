/*
  # Add Per-Slide Detailed Feedback

  1. Changes
    - Add `feedback` column to `analysis_pages` table to store brutal, specific VC feedback
    - Add `recommendations` column to store actionable fix recommendations
    - Add `ideal_version` column to describe what a perfect version would look like

  2. Purpose
    - Enable detailed, brutal per-slide feedback from VC perspective
    - Provide specific, actionable recommendations that will boost scores
    - Give founders clear vision of what excellent slides look like
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_pages' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE analysis_pages ADD COLUMN feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_pages' AND column_name = 'recommendations'
  ) THEN
    ALTER TABLE analysis_pages ADD COLUMN recommendations jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_pages' AND column_name = 'ideal_version'
  ) THEN
    ALTER TABLE analysis_pages ADD COLUMN ideal_version text;
  END IF;
END $$;