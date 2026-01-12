/*
  # Add Status Field to Analyses Table

  ## Overview
  Adds a `status` field to track the analysis lifecycle: pending, processing, completed, or failed.
  This enables background processing where users can upload and immediately see their deck
  while analysis continues server-side.

  ## Changes
  - Add `status` column with CHECK constraint
  - Add `error_message` column for failed analyses
  - Set default status to 'pending'
  - Add index for efficient status queries
  - Update existing records to 'completed' status
*/

-- Add status column to analyses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'status'
  ) THEN
    ALTER TABLE analyses 
    ADD COLUMN status text DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;

-- Add error_message column for failed analyses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE analyses 
    ADD COLUMN error_message text;
  END IF;
END $$;

-- Update existing analyses to 'completed' status (they were already analyzed)
UPDATE analyses 
SET status = 'completed' 
WHERE status IS NULL OR status = 'pending';

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_user_status ON analyses(user_id, status) WHERE user_id IS NOT NULL;

