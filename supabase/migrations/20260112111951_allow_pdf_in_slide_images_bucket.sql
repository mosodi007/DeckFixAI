/*
  # Allow PDF Files in Slide Images Bucket
  
  ## Overview
  Updates the slide-images bucket to allow PDF file uploads in addition to images.
  This enables storing the original PDF files alongside the extracted page images.
  
  ## Changes
  
  ### Storage Bucket
  - Update `slide-images` bucket to allow `application/pdf` MIME type
  - Keep existing image MIME types (png, jpeg, jpg, webp)
  
  ## Notes
  - PDFs will be stored as `{analysisId}/document.pdf`
  - Images continue to be stored as `{analysisId}/page_{pageNumber}.jpg`
*/

-- Update the slide-images bucket to allow PDF files
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
WHERE id = 'slide-images';

