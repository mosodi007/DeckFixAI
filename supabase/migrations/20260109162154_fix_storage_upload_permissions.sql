/*
  # Fix Storage Upload Permissions
  
  ## Overview
  Allows public/anonymous users to upload slide images to the storage bucket.
  
  ## Changes
  
  ### Storage Policies
  - Add policy allowing public to insert images into slide-images bucket
  - Add policy allowing public to update images (for upsert functionality)
  - Maintain existing policies for read/delete operations
  
  ## Security Notes
  - Public can upload images (needed for frontend PDF upload)
  - Public can read images (already configured)
  - Only service role can delete images
  - All uploads restricted to slide-images bucket only
*/

-- Allow public to upload slide images
DROP POLICY IF EXISTS "Public can upload slide images" ON storage.objects;
CREATE POLICY "Public can upload slide images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'slide-images');

-- Allow public to update slide images (for upsert)
DROP POLICY IF EXISTS "Public can update slide images" ON storage.objects;
CREATE POLICY "Public can update slide images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'slide-images')
  WITH CHECK (bucket_id = 'slide-images');