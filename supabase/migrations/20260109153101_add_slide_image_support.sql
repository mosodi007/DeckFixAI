/*
  # Add Slide Image Support

  ## Overview
  Adds support for storing slide images/thumbnails for each analyzed page.

  ## Changes
  
  ### Column Addition
  - Add `image_url` column to `analysis_pages` table to store slide preview images
  - Add `thumbnail_url` column to `analysis_pages` table for smaller preview images
  
  ## Notes
  - Images will be stored in Supabase Storage and URLs stored in database
  - Nullable fields to maintain backward compatibility with existing data
*/

-- Add image URL columns to analysis_pages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_pages' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE analysis_pages ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_pages' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE analysis_pages ADD COLUMN thumbnail_url text;
  END IF;
END $$;