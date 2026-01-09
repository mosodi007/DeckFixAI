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

    const { data: { publicUrl } } = supabase.storage
      .from('slide-images')
      .getPublicUrl(fileName);

    urls.push(publicUrl);
  }

  onProgress?.({
    currentPage: images.length,
    totalPages: images.length,
    status: 'complete',
    message: 'All images uploaded successfully'
  });

  return urls;
}
