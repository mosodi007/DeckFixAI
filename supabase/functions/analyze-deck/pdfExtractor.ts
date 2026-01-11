import * as pdfjsLib from 'npm:pdfjs-dist@4.0.379';

interface PageData {
  pageNumber: number;
  text: string;
  images: string[];
}

export async function extractContentFromPDF(arrayBuffer: ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
  pages: PageData[];
  allImages: string[];
}> {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/',
  });
  
  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;
  
  console.log(`PDF loaded: ${pageCount} pages`);
  
  const pages: PageData[] = [];
  const allImages: string[] = [];
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    console.log(`Processing page ${pageNum}/${pageCount}`);
    
    const page = await pdfDocument.getPage(pageNum);
    
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
    
    const pageImages: string[] = [];
    
    try {
      const operatorList = await page.getOperatorList();
      
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        
        if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
          const imageName = operatorList.argsArray[i][0];
          
          try {
            const image = await page.objs.get(imageName);
            
            if (image && image.width && image.height && image.data) {
              const imageData = image.data;
              const width = image.width;
              const height = image.height;
              
              const canvas = new OffscreenCanvas(width, height);
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                const rgbaData = new Uint8ClampedArray(width * height * 4);
                
                if (imageData.length === width * height * 3) {
                  for (let j = 0; j < width * height; j++) {
                    rgbaData[j * 4] = imageData[j * 3];
                    rgbaData[j * 4 + 1] = imageData[j * 3 + 1];
                    rgbaData[j * 4 + 2] = imageData[j * 3 + 2];
                    rgbaData[j * 4 + 3] = 255;
                  }
                } else if (imageData.length === width * height * 4) {
                  rgbaData.set(imageData);
                } else if (imageData.length === width * height) {
                  for (let j = 0; j < width * height; j++) {
                    const gray = imageData[j];
                    rgbaData[j * 4] = gray;
                    rgbaData[j * 4 + 1] = gray;
                    rgbaData[j * 4 + 2] = gray;
                    rgbaData[j * 4 + 3] = 255;
                  }
                }
                
                const imgData = new ImageData(rgbaData, width, height);
                ctx.putImageData(imgData, 0, 0);
                
                const blob = await canvas.convertToBlob({ type: 'image/png' });
                const arrayBuf = await blob.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
                const dataUrl = `data:image/png;base64,${base64}`;
                
                pageImages.push(dataUrl);
                allImages.push(dataUrl);
                console.log(`Extracted image ${pageImages.length} from page ${pageNum} (${width}x${height})`);
              }
            }
          } catch (imgError) {
            console.warn(`Failed to extract image on page ${pageNum}:`, imgError);
          }
        }
      }
    } catch (opsError) {
      console.warn(`Failed to get operator list for page ${pageNum}:`, opsError);
    }
    
    pages.push({
      pageNumber: pageNum,
      text: pageText.trim(),
      images: pageImages,
    });
  }
  
  console.log(`Extraction complete: ${fullText.length} chars, ${allImages.length} images`);
  
  return {
    text: fullText,
    pageCount,
    pages,
    allImages,
  };
}