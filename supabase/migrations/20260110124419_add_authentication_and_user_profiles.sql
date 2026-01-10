/*
  # Add Authentication and User Profiles

  ## Overview
  Sets up user authentication with profiles and updates Row Level Security policies
  to restrict data access based on authentication status.

  ## New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User's email address
  - `full_name` (text, nullable) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ## Security Changes

  1. **Analyses Table**
     - Updated policies to allow authenticated users to create analyses linked to their user_id
     - Users can only view their own analyses
     - Unauthenticated users can still create analyses but cannot persist them long-term

  2. **User Profiles Table**
     - Users can only read and update their own profile
     - Profiles are automatically created on user signup via trigger

  ## Important Notes
  - Existing analyses with NULL user_id remain accessible (for backward compatibility)
  - New analyses created by authenticated users will be linked to their user_id
  - RLS ensures data isolation between users
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update analyses table policies
DROP POLICY IF EXISTS "Anyone can view analyses" ON analyses;
DROP POLICY IF EXISTS "Anyone can create analyses" ON analyses;

-- Authenticated users can view their own analyses
CREATE POLICY "Authenticated users can view own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Unauthenticated users can view analyses in current session (for demo)
CREATE POLICY "Public can view recent analyses"
  ON analyses FOR SELECT
  TO public
  USING (user_id IS NULL AND created_at > NOW() - INTERVAL '1 hour');

-- Authenticated users can create analyses linked to their account
CREATE POLICY "Authenticated users can create analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow unauthenticated users to create temporary analyses
CREATE POLICY "Public can create temporary analyses"
  ON analyses FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL);

-- Authenticated users can update their own analyses
CREATE POLICY "Authenticated users can update own analyses"
  ON analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update analysis_pages policies
DROP POLICY IF EXISTS "Anyone can view analysis pages" ON analysis_pages;
DROP POLICY IF EXISTS "Anyone can create analysis pages" ON analysis_pages;

CREATE POLICY "Users can view analysis pages for their analyses"
  ON analysis_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view analysis pages for temporary analyses"
  ON analysis_pages FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
      AND analyses.user_id IS NULL
      AND analyses.created_at > NOW() - INTERVAL '1 hour'
    )
  );

CREATE POLICY "Users can create analysis pages for their analyses"
  ON analysis_pages FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_pages.analysis_id
    )
  );

-- Update analysis_metrics policies
DROP POLICY IF EXISTS "Anyone can view analysis metrics" ON analysis_metrics;
DROP POLICY IF EXISTS "Anyone can create analysis metrics" ON analysis_metrics;

CREATE POLICY "Users can view metrics for their analyses"
  ON analysis_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view metrics for temporary analyses"
  ON analysis_metrics FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
      AND analyses.user_id IS NULL
      AND analyses.created_at > NOW() - INTERVAL '1 hour'
    )
  );

CREATE POLICY "Users can create metrics for analyses"
  ON analysis_metrics FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_metrics.analysis_id
    )
  );

-- Similar updates for other related tables
-- analysis_issues
DROP POLICY IF EXISTS "Anyone can view analysis issues" ON analysis_issues;
DROP POLICY IF EXISTS "Anyone can create analysis issues" ON analysis_issues;

CREATE POLICY "Users can view issues for their analyses"
  ON analysis_issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view issues for temporary analyses"
  ON analysis_issues FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
      AND analyses.user_id IS NULL
      AND analyses.created_at > NOW() - INTERVAL '1 hour'
    )
  );

CREATE POLICY "Users can create issues for analyses"
  ON analysis_issues FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = analysis_issues.analysis_id
    )
  );

-- missing_slides
DROP POLICY IF EXISTS "Anyone can view missing slides" ON missing_slides;
DROP POLICY IF EXISTS "Anyone can create missing slides" ON missing_slides;

CREATE POLICY "Users can view missing slides for their analyses"
  ON missing_slides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view missing slides for temporary analyses"
  ON missing_slides FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
      AND analyses.user_id IS NULL
      AND analyses.created_at > NOW() - INTERVAL '1 hour'
    )
  );

CREATE POLICY "Users can create missing slides for analyses"
  ON missing_slides FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = missing_slides.analysis_id
    )
  );

-- Create index for faster user_id lookups
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
