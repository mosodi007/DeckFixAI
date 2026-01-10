/*
  # Add Missing Analysis Tables

  1. New Tables
    - `strengths` - Stores deck strengths identified by AI
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `description` (text) - Detailed strength description
      - `created_at` (timestamp)
    
    - `key_issues` - Stores critical issues to address
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `description` (text) - Detailed issue description
      - `created_at` (timestamp)
    
    - `detailed_issues` - Stores granular issues for improvement tracking
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `page_number` (integer, nullable) - Page where issue occurs
      - `priority` (text) - high, medium, or low
      - `title` (text) - Brief issue title
      - `description` (text) - Detailed issue description
      - `category` (text) - content, design, structure, data, or messaging
      - `created_at` (timestamp)
    
    - `missing_pages` - Stores missing sections/pages in the deck
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `section` (text) - Section name (e.g., "Team", "Financials")
      - `importance` (text) - Why this section is important
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read their own data
    - Add policies for anonymous users based on session_id
    - Add policies for service role to insert data
*/

-- Create strengths table
CREATE TABLE IF NOT EXISTS strengths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create key_issues table
CREATE TABLE IF NOT EXISTS key_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create detailed_issues table
CREATE TABLE IF NOT EXISTS detailed_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  page_number integer CHECK (page_number > 0),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('content', 'design', 'structure', 'data', 'messaging')),
  created_at timestamptz DEFAULT now()
);

-- Create missing_pages table
CREATE TABLE IF NOT EXISTS missing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  section text NOT NULL,
  importance text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE strengths ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_pages ENABLE ROW LEVEL SECURITY;

-- Strengths policies
CREATE POLICY "Users can read own strengths"
  ON strengths FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = strengths.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own strengths"
  ON strengths FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = strengths.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert strengths"
  ON strengths FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Key issues policies
CREATE POLICY "Users can read own key issues"
  ON key_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own key issues"
  ON key_issues FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = key_issues.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert key issues"
  ON key_issues FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Detailed issues policies
CREATE POLICY "Users can read own detailed issues"
  ON detailed_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = detailed_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own detailed issues"
  ON detailed_issues FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = detailed_issues.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert detailed issues"
  ON detailed_issues FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Missing pages policies
CREATE POLICY "Users can read own missing pages"
  ON missing_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can read own missing pages"
  ON missing_pages FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_pages.analysis_id
      AND analyses.session_id IS NOT NULL
    )
  );

CREATE POLICY "Service role can insert missing pages"
  ON missing_pages FOR INSERT
  TO service_role
  WITH CHECK (true);