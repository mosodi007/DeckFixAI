/*
  # Add Deck Quality Metrics

  1. Changes
    - Add `word_density` column to analyses table
      - Stores assessment of text density (Low, Medium, High, Very High)
      - Helps identify if deck has too much text
    - Add `disruption_signal` column to analyses table
      - Stores assessment of idea's disruptiveness (0-100 score)
      - Measures how innovative/disruptive the business idea is
  
  2. Notes
    - total_pages already exists in the table, so page count is already tracked
    - These metrics will be calculated by the OpenAI analysis
    - word_density: categorizes the amount of text per slide
    - disruption_signal: quantifies innovation potential
*/

DO $$
BEGIN
  -- Add word_density column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'word_density'
  ) THEN
    ALTER TABLE analyses ADD COLUMN word_density text DEFAULT 'Not analyzed';
  END IF;

  -- Add disruption_signal column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'disruption_signal'
  ) THEN
    ALTER TABLE analyses ADD COLUMN disruption_signal integer DEFAULT 0;
  END IF;
END $$;