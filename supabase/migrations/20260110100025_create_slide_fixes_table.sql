/*
  # Create Slide Fixes Tracking Table

  1. New Tables
    - `analysis_slide_fixes`
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `page_number` (integer) - The slide number
      - `issue_type` (text) - Type of issue being fixed
      - `issue_description` (text) - Description of the issue
      - `generated_fix` (jsonb) - Complete fix object with all details
      - `exact_replacement_text` (text) - Exact text to replace
      - `visual_recommendations` (text[]) - Array of visual suggestions
      - `implementation_steps` (text[]) - Step-by-step instructions
      - `estimated_score_improvement` (decimal) - Expected score increase
      - `applied` (boolean) - Whether fix has been applied
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `analysis_slide_fixes` table
    - Add policy for authenticated users to manage their fixes

  3. Indexes
    - Index on analysis_id for fast lookups
    - Index on page_number for slide-specific queries
*/

CREATE TABLE IF NOT EXISTS analysis_slide_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  page_number integer NOT NULL,
  issue_type text NOT NULL,
  issue_description text NOT NULL,
  generated_fix jsonb NOT NULL DEFAULT '{}'::jsonb,
  exact_replacement_text text,
  visual_recommendations text[] DEFAULT ARRAY[]::text[],
  implementation_steps text[] DEFAULT ARRAY[]::text[],
  estimated_score_improvement decimal(3,1) DEFAULT 0,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analysis_slide_fixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own slide fixes"
  ON analysis_slide_fixes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  );

CREATE POLICY "Users can insert their own slide fixes"
  ON analysis_slide_fixes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  );

CREATE POLICY "Users can update their own slide fixes"
  ON analysis_slide_fixes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  );

CREATE POLICY "Users can delete their own slide fixes"
  ON analysis_slide_fixes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_slide_fixes.analysis_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_slide_fixes_analysis_id ON analysis_slide_fixes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_slide_fixes_page_number ON analysis_slide_fixes(page_number);
CREATE INDEX IF NOT EXISTS idx_slide_fixes_applied ON analysis_slide_fixes(applied);
