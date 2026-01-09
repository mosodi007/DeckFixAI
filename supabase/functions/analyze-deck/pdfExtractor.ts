import { extractText, getDocumentProxy } from "npm:unpdf";

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The file may be image-based, encrypted, or corrupted.');
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