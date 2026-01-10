/*
  # Add slide analysis tracking to analyses table

  1. Changes
    - Add `slides_analyzed_at` column to `analyses` table to track when in-depth slide analysis was completed
    - This allows the UI to determine if slides have already been analyzed and skip showing the analysis modal

  2. Notes
    - Column is nullable and defaults to NULL (analysis not done)
    - When slide analysis completes, this field will be set to the current timestamp
    - This prevents redundant slide analysis on subsequent visits to the improvement flow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'slides_analyzed_at'
  ) THEN
    ALTER TABLE analyses ADD COLUMN slides_analyzed_at timestamptz DEFAULT NULL;
  END IF;
END $$;