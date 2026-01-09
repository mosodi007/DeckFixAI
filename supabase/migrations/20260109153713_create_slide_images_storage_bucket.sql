/*
  # Create Storage Bucket for Slide Images

  ## Overview
  Creates a public storage bucket to store PDF slide preview images.

  ## Changes
  
  ### Storage Bucket
  - Create `slide-images` bucket for storing slide preview images
  - Set bucket to public for easy image access
  - No file size limits for flexibility
  
  ### Security
  - Public bucket allows anyone to read images
  - Only authenticated users or service role can upload
  - Policies ensure proper access control
  
  ## Notes
  - Images are organized by analysis ID: `{analysisId}/slide-{pageNumber}.png`
  - Public access allows direct image URLs in frontend
*/

-- Create storage bucket for slide images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slide-images',
  'slide-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public to read slide images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view slide images'
  ) THEN
    CREATE POLICY "Anyone can view slide images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'slide-images');
  END IF;
END $$;

-- Allow service role to upload slide images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload slide images'
  ) THEN
    CREATE POLICY "Service role can upload slide images"
      ON storage.objects FOR INSERT
      TO service_role
      WITH CHECK (bucket_id = 'slide-images');
  END IF;
END $$;

-- Allow service role to update slide images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can update slide images'
  ) THEN
    CREATE POLICY "Service role can update slide images"
      ON storage.objects FOR UPDATE
      TO service_role
      USING (bucket_id = 'slide-images')
      WITH CHECK (bucket_id = 'slide-images');
  END IF;
END $$;

-- Allow service role to delete slide images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete slide images'
  ) THEN
    CREATE POLICY "Service role can delete slide images"
      ON storage.objects FOR DELETE
      TO service_role
      USING (bucket_id = 'slide-images');
  END IF;
END $$;