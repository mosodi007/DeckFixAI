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

    const totalPages = pdf.numPages;
    console.log(`PDF has ${totalPages} pages`);

    const pages: PageText[] = [];
    let formattedText = '';
    let totalTextLength = 0;

    for (let i = 1; i <= totalPages; i++) {
      try {
        const pageResult = await extractText(pdf, { page: i });
        const pageText = pageResult.text || '';

        pages.push({
          pageNumber: i,
          text: pageText.trim()
        });

        totalTextLength += pageText.length;
        formattedText += `\n\n--- PAGE ${i} ---\n${pageText.trim()}\n--- END PAGE ${i} ---\n`;

        console.log(`Page ${i}: ${pageText.trim().length} characters`);
      } catch (pageError) {
        console.warn(`Failed to extract text from page ${i}:`, pageError);
        pages.push({
          pageNumber: i,
          text: ''
        });
        formattedText += `\n\n--- PAGE ${i} ---\n\n--- END PAGE ${i} ---\n`;
      }
    }

    console.log(`Total extraction: ${totalTextLength} characters from ${totalPages} pages`);

    if (totalTextLength < 10) {
      throw new Error('Could not extract sufficient text from PDF. The file appears to be image-based.');
    }

    return {
      text: formattedText.trim(),
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