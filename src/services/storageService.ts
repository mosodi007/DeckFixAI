import { createClient } from '@supabase/supabase-js';
import { PageImage } from './pdfImageExtractor';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface UploadProgress {
  currentPage: number;
  totalPages: number;
  status: 'uploading' | 'complete' | 'error';
  message?: string;
}

export async function uploadPageImages(
  images: PageImage[],
  analysisId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const fileName = `${analysisId}/page_${image.pageNumber}.jpg`;

    onProgress?.({
      currentPage: i + 1,
      totalPages: images.length,
      status: 'uploading',
      message: `Uploading page ${image.pageNumber} of ${images.length}...`
    });

    const { error } = await supabase.storage
      .from('slide-images')
      .upload(fileName, image.blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      onProgress?.({
        currentPage: i + 1,
        totalPages: images.length,
        status: 'error',
        message: `Failed to upload page ${image.pageNumber}: ${error.message}`
      });
      throw error;
    }

    // Use signed URL instead of public URL for guaranteed immediate access
    // Signed URLs work immediately after upload and don't depend on CDN propagation
    // Valid for 1 hour (3600 seconds) - more than enough time for analysis to complete
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('slide-images')
      .createSignedUrl(fileName, 3600);

    if (signedUrlError || !signedUrlData) {
      onProgress?.({
        currentPage: i + 1,
        totalPages: images.length,
        status: 'error',
        message: `Failed to create signed URL for page ${image.pageNumber}: ${signedUrlError?.message || 'Unknown error'}`
      });
      throw new Error(`Failed to create signed URL for page ${image.pageNumber}: ${signedUrlError?.message || 'Unknown error'}`);
    }

    urls.push(signedUrlData.signedUrl);
  }

  onProgress?.({
    currentPage: images.length,
    totalPages: images.length,
    status: 'complete',
    message: 'All images uploaded successfully'
  });

  return urls;
}

export async function deleteAnalysisImages(analysisId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from('slide-images')
    .list(analysisId);

  if (listError) {
    console.error('Error listing files for deletion:', listError);
    throw listError;
  }

  if (!files || files.length === 0) {
    return;
  }

  const filePaths = files.map(file => `${analysisId}/${file.name}`);

  const { error: deleteError } = await supabase.storage
    .from('slide-images')
    .remove(filePaths);

  if (deleteError) {
    console.error('Error deleting images:', deleteError);
    throw deleteError;
  }
}

/**
 * Uploads the PDF file to storage and returns a signed URL
 * This avoids sending large files in the request body to Edge Functions
 */
export async function uploadPdfFile(
  file: File,
  analysisId: string
): Promise<string> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:111',message:'uploadPdfFile entry',data:{analysisId,fileName:file.name,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  const fileName = `${analysisId}/document.pdf`;

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:117',message:'Before storage upload',data:{fileName,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  const { error } = await supabase.storage
    .from('slide-images')
    .upload(fileName, file, {
      contentType: 'application/pdf',
      upsert: true
    });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:124',message:'After storage upload',data:{hasError:!!error,errorMessage:error?.message,errorCode:error?.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:125',message:'Upload error - throwing',data:{error:error.message,code:error.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    throw new Error(`Failed to upload PDF file: ${error.message}`);
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:129',message:'Before createSignedUrl',data:{fileName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  // Create signed URL for the PDF (valid for 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('slide-images')
    .createSignedUrl(fileName, 3600);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:133',message:'After createSignedUrl',data:{hasData:!!signedUrlData,hasError:!!signedUrlError,errorMessage:signedUrlError?.message,signedUrlLength:signedUrlData?.signedUrl?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  if (signedUrlError || !signedUrlData) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:134',message:'Signed URL error - throwing',data:{error:signedUrlError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw new Error(`Failed to create signed URL for PDF: ${signedUrlError?.message || 'Unknown error'}`);
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'storageService.ts:137',message:'uploadPdfFile success',data:{signedUrl:signedUrlData.signedUrl.substring(0,100)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,E'})}).catch(()=>{});
  // #endregion
  return signedUrlData.signedUrl;
}

export function getCoverImageUrl(analysisId: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('slide-images')
    .getPublicUrl(`${analysisId}/page_1.jpg`);

  return publicUrl;
}
