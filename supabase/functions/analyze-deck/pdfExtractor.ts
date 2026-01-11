export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
}> {
  const pdfjsLib = await import('npm:pdfjs-dist@4.9.155');

  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    useSystemFonts: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  console.log(`PDF loaded: ${pageCount} pages`);

  const pages: Array<{ pageNumber: number; text: string }> = [];
  let fullText = '';

  for (let i = 1; i <= pageCount; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      console.log(`Page ${i}: Found ${textContent.items.length} text items`);
      
      // Log first few items to debug structure
      if (textContent.items.length > 0) {
        console.log(`Page ${i}: First item structure:`, JSON.stringify(textContent.items[0], null, 2).substring(0, 200));
      }
      
      // Extract text from items, handling different text item structures
      // Use a more robust approach that preserves spacing
      const pageTextParts: string[] = [];
      
      for (let idx = 0; idx < textContent.items.length; idx++) {
        const item = textContent.items[idx];
        let text = '';
        
        // Handle different item structures
        if (typeof item === 'string') {
          text = item;
        } else if (item && typeof item === 'object') {
          // pdfjs-dist typically uses 'str' property
          // But check multiple possible property names
          text = item.str || item.text || item.content || item.value || '';
          
          // If still empty, check if item has any string-like properties
          if (!text) {
            for (const key in item) {
              if (typeof item[key] === 'string' && item[key].length > 0) {
                text = item[key];
                break;
              }
            }
          }
        }
        
        // Add text (including spaces and single characters)
        // Don't filter out - even single spaces are important for text extraction
        if (text !== null && text !== undefined) {
          const textStr = String(text);
          // Only skip if it's truly empty, but keep spaces
          if (textStr.length > 0) {
            pageTextParts.push(textStr);
          }
        }
      }
      
      // Join with space to preserve word boundaries
      const pageText = pageTextParts.join(' ');
      const pageTextTrimmed = pageText.trim();
      
      console.log(`Page ${i}: Extracted ${pageTextTrimmed.length} characters from ${pageTextParts.length} text parts`);

      pages.push({
        pageNumber: i,
        text: pageTextTrimmed,
      });

      if (pageTextTrimmed) {
        fullText += `Page ${i}:\n${pageTextTrimmed}\n\n`;
      } else {
        console.warn(`Page ${i}: No text extracted. Item count: ${textContent.items.length}`);
      }
    } catch (pageError: any) {
      console.error(`Error extracting text from page ${i}:`, pageError);
      console.error(`Page error stack:`, pageError.stack);
      // Continue with other pages even if one fails
      pages.push({
        pageNumber: i,
        text: '',
      });
    }
  }

  const fullTextTrimmed = fullText.trim();
  console.log(`Total extracted text: ${fullTextTrimmed.length} characters from ${pageCount} pages`);

  // If no text was extracted, log detailed warning
  if (fullTextTrimmed.length === 0) {
    console.warn('WARNING: No text extracted from PDF. This might be a scanned PDF or image-based PDF.');
    console.warn('Attempting alternative extraction method...');
    
    // Try alternative method: use renderTextLayer or getOperatorList
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      console.log(`Viewport: ${viewport.width}x${viewport.height}`);
      
      // Try to get text using renderTextContent
      const textContent = await page.getTextContent();
      console.log(`Alternative check - Text items: ${textContent.items.length}`);
      
      if (textContent.items.length > 0) {
        console.log('Sample items:', textContent.items.slice(0, 3));
      }
    } catch (altError: any) {
      console.error('Alternative extraction also failed:', altError);
    }
  }

  return {
    text: fullTextTrimmed,
    pageCount,
    pages,
  };
}