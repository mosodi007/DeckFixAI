/*
  # DeckFix Pitch Deck Analysis Schema

  ## Overview
  Creates the database schema for storing pitch deck analyses, including overall metrics,
  page-level scores, identified issues, improvement suggestions, and missing slide recommendations.

  ## New Tables

  ### `analyses`
  - `id` (uuid, primary key) - Unique identifier for each analysis
  - `file_name` (text) - Original filename of the uploaded pitch deck
  - `file_size` (bigint) - File size in bytes
  - `overall_score` (integer) - Overall deck score (0-100)
  - `total_pages` (integer) - Number of pages in the deck
  - `summary` (text) - AI-generated executive summary
  - `created_at` (timestamptz) - When the analysis was created
  - `user_id` (uuid, nullable) - Optional user association for future auth

  ### `analysis_pages`
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key) - Reference to parent analysis
  - `page_number` (integer) - Page number in the deck
  - `title` (text) - Page title/heading
  - `score` (integer) - Individual page score (0-100)
  - `content` (text, nullable) - Extracted text content from page

  ### `analysis_issues`
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key)
  - `page_number` (integer, nullable) - Associated page number
  - `priority` (text) - High, Medium, or Low
  - `title` (text) - Issue title
  - `description` (text) - Detailed description of the issue
  - `type` (text) - Type: 'issue' or 'improvement'

  ### `missing_slides`
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key)
  - `priority` (text) - High, Medium, or Low
  - `title` (text) - Missing slide title
  - `description` (text) - Why this slide is important
  - `suggested_content` (text) - What should be included

  ### `analysis_metrics`
  - `id` (uuid, primary key)
  - `analysis_id` (uuid, foreign key)
  - `strengths` (text[]) - Array of identified strengths
  - `weaknesses` (text[]) - Array of identified weaknesses
  - `clarity_score` (integer) - Message clarity score
  - `design_score` (integer) - Visual design score
  - `content_score` (integer) - Content quality score
  - `structure_score` (integer) - Deck structure score

  ## Security
  - Enable RLS on all tables
  - Public read access for demo purposes (can be restricted later with auth)
  - Authenticated users can create and modify their own analyses
*/

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  total_pages integer NOT NULL CHECK (total_pages > 0),
  summary text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view analyses"
  ON analyses FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analyses"
  ON analyses FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_pages table
CREATE TABLE IF NOT EXISTS analysis_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  title text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  content text,
  UNIQUE(analysis_id, page_number)
);

ALTER TABLE analysis_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view analysis pages"
  ON analysis_pages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analysis pages"
  ON analysis_pages FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_issues table
CREATE TABLE IF NOT EXISTS analysis_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  page_number integer CHECK (page_number > 0),
  priority text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('issue', 'improvement'))
);

ALTER TABLE analysis_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view analysis issues"
  ON analysis_issues FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analysis issues"
  ON analysis_issues FOR INSERT
  TO public
  WITH CHECK (true);

-- Create missing_slides table
CREATE TABLE IF NOT EXISTS missing_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  priority text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  title text NOT NULL,
  description text NOT NULL,
  suggested_content text NOT NULL
);

ALTER TABLE missing_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view missing slides"
  ON missing_slides FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create missing slides"
  ON missing_slides FOR INSERT
  TO public
  WITH CHECK (true);

-- Create analysis_metrics table
CREATE TABLE IF NOT EXISTS analysis_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  clarity_score integer NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
  design_score integer NOT NULL CHECK (design_score >= 0 AND design_score <= 100),
  content_score integer NOT NULL CHECK (content_score >= 0 AND content_score <= 100),
  structure_score integer NOT NULL CHECK (structure_score >= 0 AND structure_score <= 100),
  UNIQUE(analysis_id)
);

ALTER TABLE analysis_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view analysis metrics"
  ON analysis_metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create analysis metrics"
  ON analysis_metrics FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_pages_analysis_id ON analysis_pages(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_issues_analysis_id ON analysis_issues(analysis_id);
CREATE INDEX IF NOT EXISTS idx_missing_slides_analysis_id ON missing_slides(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_metrics_analysis_id ON analysis_metrics(analysis_id);
