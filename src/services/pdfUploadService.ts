import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  pdfPath: string;
  bucket: string;
}

/**
 * Uploads a PDF file directly to Supabase Storage
 * @param file - The PDF file to upload
 * @param userId - The user ID for organizing files
 * @param onProgress - Optional progress callback
 * @returns The storage path and bucket name
 */
export async function uploadPdf(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are supported');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Generate unique file path: {userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const pdfPath = `${userId}/${timestamp}-${sanitizedFileName}`;
  const bucket = 'pdfs';

  // Upload file with progress tracking
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(pdfPath, file, {
      contentType: 'application/pdf',
      upsert: false, // Don't overwrite existing files
      cacheControl: '3600',
    });

  if (error) {
    console.error('PDF upload error:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Note: Supabase storage upload doesn't provide progress events in the current SDK
  // If progress tracking is needed, we'd need to use XMLHttpRequest or fetch with manual tracking
  onProgress?.({
    loaded: file.size,
    total: file.size,
    percentage: 100,
  });

  console.log(`PDF uploaded successfully: ${bucket}/${pdfPath}`);

  return {
    pdfPath,
    bucket,
  };
}

/**
 * Validates a PDF file before upload
 * @param file - The file to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validatePdfFile(file: File): { isValid: boolean; error?: string } {
  if (file.type !== 'application/pdf') {
    return { isValid: false, error: 'Only PDF files are supported' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  return { isValid: true };
}

