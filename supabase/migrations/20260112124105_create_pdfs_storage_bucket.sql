/*
  # Create Storage Bucket for PDF Files

  ## Overview
  Creates a storage bucket for PDF files with proper RLS policies.
  Users can upload and read their own PDFs, and service role can read all PDFs for processing.

  ## Changes
  
  ### Storage Bucket
  - Create `pdfs` bucket for storing PDF files
  - Set bucket to private (not public)
  - File size limit: 15MB (15728640 bytes)
  - Allowed MIME types: application/pdf only
  
  ### Security Policies
  - Authenticated users can upload their own PDFs
  - Authenticated users can read their own PDFs
  - Service role can read all PDFs (for Edge Function processing)
  - Service role can delete PDFs (for cleanup)
*/

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  false, -- Private bucket
  15728640, -- 15MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own PDFs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own PDFs'
  ) THEN
    CREATE POLICY "Users can upload their own PDFs"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'pdfs' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow authenticated users to read their own PDFs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can read their own PDFs'
  ) THEN
    CREATE POLICY "Users can read their own PDFs"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'pdfs' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Allow service role to read all PDFs (for Edge Function processing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can read all PDFs'
  ) THEN
    CREATE POLICY "Service role can read all PDFs"
      ON storage.objects FOR SELECT
      TO service_role
      USING (bucket_id = 'pdfs');
  END IF;
END $$;

-- Allow service role to delete PDFs (for cleanup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete PDFs'
  ) THEN
    CREATE POLICY "Service role can delete PDFs"
      ON storage.objects FOR DELETE
      TO service_role
      USING (bucket_id = 'pdfs');
  END IF;
END $$;

