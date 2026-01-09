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

    const { totalPages, text: fullText } = await extractText(pdf, { mergePages: true });
    console.log(`PDF has ${totalPages} pages, ${fullText?.length || 0} characters total`);

    if (!fullText || fullText.trim().length < 10) {
      throw new Error('Could not extract sufficient text from PDF. The file appears to be image-based.');
    }
    const pageTexts = fullText.split(/\f|\n{3,}/);
    console.log(`Split into ${pageTexts.length} sections`);

    const pages: PageText[] = [];
    let formattedText = '';

    for (let i = 0; i < totalPages; i++) {
      const pageNumber = i + 1;
      const pageText = pageTexts[i] || '';

      pages.push({
        pageNumber,
        text: pageText.trim()
      });

      formattedText += `\n\n--- PAGE ${pageNumber} ---\n${pageText.trim()}\n--- END PAGE ${pageNumber} ---\n`;
    }

    console.log(`Total extraction: ${formattedText.length} characters from ${totalPages} pages`);

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
