/*
  # Add Deal Breakers Table

  1. New Tables
    - `deal_breakers` - Stores absolute deal breakers from analysis
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `description` (text) - Deal breaker description
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on table
    - Add policies for authenticated users to read their own data
    - Add policies for anonymous users based on session_id
    - Add policies for service role to insert data
*/

-- Create deal_breakers table
CREATE TABLE IF NOT EXISTS deal_breakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deal_breakers ENABLE ROW LEVEL SECURITY;

-- Deal breakers policies
CREATE POLICY "Users can read own deal breakers"
  ON deal_breakers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = deal_breakers.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own deal breakers"
  ON deal_breakers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = deal_breakers.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert deal breakers"
  ON deal_breakers FOR INSERT
  TO service_role
  WITH CHECK (true);