import { extractText, getDocumentProxy } from "npm:unpdf";

export interface PageText {
  pageNumber: number;
  text: string;
}

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number; pages: PageText[] }> {
  try {
    console.log('Starting PDF extraction with unpdf...');
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    console.log('PDF document proxy created');

    const { totalPages } = await extractText(pdf, { mergePages: true });
    console.log(`PDF has ${totalPages} pages`);

    const pages: PageText[] = [];
    let allText = '';

    for (let i = 1; i <= totalPages; i++) {
      try {
        const pageResult = await extractText(pdf, { mergePages: false, pages: [i] });
        const pageText = pageResult.text || '';

        pages.push({
          pageNumber: i,
          text: pageText.trim()
        });

        allText += `\n\n--- PAGE ${i} ---\n${pageText.trim()}\n--- END PAGE ${i} ---\n`;

        console.log(`Page ${i}: ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`Failed to extract page ${i}:`, pageError);
        pages.push({
          pageNumber: i,
          text: ''
        });
      }
    }

    if (allText.trim().length < 10) {
      throw new Error('Could not extract sufficient text from PDF. The file appears to be image-based. Consider using a text-based PDF or enabling OCR.');
    }

    console.log(`Total extraction: ${allText.length} characters from ${totalPages} pages`);
    console.log('First 500 chars:', allText.substring(0, 500));

    return {
      text: allText.trim(),
      pageCount: totalPages,
      pages
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error('Could not extract text from PDF. Please ensure the file is a valid, text-based PDF.');
  }
}