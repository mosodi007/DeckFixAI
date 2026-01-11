import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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

    console.log(`Starting extraction of ${totalPages} pages`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        onProgress?.({
          currentPage: pageNum,
          totalPages,
          status: 'processing',
          message: `Processing page ${pageNum} of ${totalPages}...`
        });

        console.log(`Extracting page ${pageNum}/${totalPages}`);

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

        console.log(`Page ${pageNum} extracted successfully (${blob.size} bytes)`);

        page.cleanup();

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (pageError) {
        console.error(`Failed to extract page ${pageNum}:`, pageError);
        throw pageError;
      }
    }

    console.log(`Successfully extracted ${images.length} pages`);

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      status: 'complete',
      message: 'All pages processed successfully'
    });

    return images;
  } catch (error) {
    console.error('PDF image extraction failed:', error);
    onProgress?.({
      currentPage: 0,
      totalPages: 0,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to extract images'
    });
    throw error;
  }
}
