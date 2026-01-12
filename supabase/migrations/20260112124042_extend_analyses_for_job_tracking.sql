/*
  # Extend Analyses Table for Job Tracking

  ## Overview
  Adds job tracking fields to the analyses table to support server-side PDF processing pipeline.
  The analyses table will now track PDF storage location, job results, and errors separately.

  ## Changes
  - Add `bucket` (text) - Storage bucket name where PDF is stored
  - Add `pdf_path` (text) - Path to PDF file in storage
  - Add `result` (jsonb) - Analysis results stored as JSON (nullable)
  - Add `error` (text) - Job error message (nullable, separate from error_message)
  - Add `updated_at` (timestamptz) - Last update timestamp for polling
  - Add index on `(user_id, status)` for efficient polling queries
  - Add trigger to auto-update `updated_at` on row changes
*/

-- Add bucket column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'bucket'
  ) THEN
    ALTER TABLE analyses ADD COLUMN bucket text;
  END IF;
END $$;

-- Add pdf_path column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'pdf_path'
  ) THEN
    ALTER TABLE analyses ADD COLUMN pdf_path text;
  END IF;
END $$;

-- Add result column (jsonb for storing analysis results)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'result'
  ) THEN
    ALTER TABLE analyses ADD COLUMN result jsonb;
  END IF;
END $$;

-- Add error column (separate from error_message for job-specific errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'error'
  ) THEN
    ALTER TABLE analyses ADD COLUMN error text;
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE analyses ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index for efficient polling queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_status_updated 
  ON analyses(user_id, status, updated_at DESC) 
  WHERE user_id IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_analyses_updated_at ON analyses;
CREATE TRIGGER trigger_update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_analyses_updated_at();

-- Initialize updated_at for existing records
UPDATE analyses 
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

