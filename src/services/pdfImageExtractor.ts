import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PageImage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  status: 'processing' | 'complete' | 'error';
  message?: string;
}

const JPEG_QUALITY = 0.85;
const MAX_DIMENSION = 2048;

export async function extractPageImages(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<PageImage[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const images: PageImage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        currentPage: pageNum,
        totalPages,
        status: 'processing',
        message: `Processing page ${pageNum} of ${totalPages}...`
      });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      let scale = 1.0;
      if (viewport.width > MAX_DIMENSION || viewport.height > MAX_DIMENSION) {
        scale = Math.min(
          MAX_DIMENSION / viewport.width,
          MAX_DIMENSION / viewport.height
        );
      }

      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas
      }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      });

      images.push({
        pageNumber: pageNum,
        blob,
        width: scaledViewport.width,
        height: scaledViewport.height
      });

      page.cleanup();
    }

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      status: 'complete',
      message: 'All pages processed successfully'
    });

    return images;
  } catch (error) {
    onProgress?.({
      currentPage: 0,
      totalPages: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to extract images'
    });
    throw error;
  }
}
