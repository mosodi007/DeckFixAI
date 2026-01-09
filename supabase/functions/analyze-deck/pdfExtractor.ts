import { extractText, getDocumentProxy } from "npm:unpdf";

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    console.log('Starting PDF extraction with unpdf...');
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    console.log('PDF document proxy created');

    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    console.log(`unpdf extracted: ${text?.length || 0} characters from ${totalPages} pages`);
    console.log('First 500 chars of extracted text:', text?.substring(0, 500));

    if (!text || text.trim().length < 10) {
      console.warn('unpdf extraction yielded minimal text, trying page-by-page extraction...');

      let allText = '';
      for (let i = 1; i <= totalPages; i++) {
        try {
          const pageResult = await extractText(pdf, { mergePages: false });
          if (pageResult.text) {
            allText += pageResult.text + '\n\n';
          }
        } catch (pageError) {
          console.warn(`Failed to extract page ${i}:`, pageError);
        }
      }

      if (allText.trim().length > 0) {
        console.log(`Page-by-page extraction: ${allText.length} characters`);
        return {
          text: allText.trim(),
          pageCount: totalPages
        };
      }

      throw new Error('Could not extract sufficient text from PDF. The file appears to be image-based. Consider using a text-based PDF or enabling OCR.');
    }

    return {
      text: text.trim(),
      pageCount: totalPages
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error('Could not extract text from PDF. Please ensure the file is a valid, text-based PDF.');
  }
}