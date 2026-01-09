/*
  # Add Key Business Metrics Table

  1. New Tables
    - `key_business_metrics`
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key to analyses)
      - `company_name` (text) - Extracted company name
      - `industry` (text) - Business industry/sector
      - `current_revenue` (text) - Current revenue figures
      - `funding_sought` (text) - Amount of funding requested
      - `growth_rate` (text) - Growth rate percentage
      - `team_size` (integer) - Number of team members
      - `market_size` (text) - Total addressable market
      - `valuation` (text) - Company valuation
      - `business_model` (text) - Revenue/business model
      - `customer_count` (text) - Number of customers/users
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `key_business_metrics` table
    - Add policy for public read access (analysis results are public)
*/

CREATE TABLE IF NOT EXISTS key_business_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  company_name text DEFAULT 'Not specified',
  industry text DEFAULT 'Not specified',
  current_revenue text DEFAULT 'Not specified',
  funding_sought text DEFAULT 'Not specified',
  growth_rate text DEFAULT 'Not specified',
  team_size integer DEFAULT 0,
  market_size text DEFAULT 'Not specified',
  valuation text DEFAULT 'Not specified',
  business_model text DEFAULT 'Not specified',
  customer_count text DEFAULT 'Not specified',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE key_business_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to key business metrics"
  ON key_business_metrics
  FOR SELECT
  TO public
  USING (true);