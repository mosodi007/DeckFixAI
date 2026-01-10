import { extractText, getDocumentProxy } from "npm:unpdf";

export interface PageText {
  pageNumber: number;
  text: string;
}

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number; pages: PageText[]; metadata?: any }> {
  try {
    console.log('Starting PDF extraction with unpdf...');
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    console.log('PDF document proxy created');

    const totalPages = pdf.numPages;
    console.log(`PDF has ${totalPages} pages`);

    let metadata;
    try {
      metadata = await pdf.getMetadata();
      console.log('PDF metadata:', JSON.stringify(metadata, null, 2));
    } catch (metaError) {
      console.warn('Failed to extract PDF metadata:', metaError);
    }

    const pages: PageText[] = [];
    let formattedText = '';
    let totalTextLength = 0;

    let metadataText = '';
    if (metadata?.info) {
      const info = metadata.info;
      if (info.Title) metadataText += `Title: ${info.Title}\n`;
      if (info.Author) metadataText += `Author: ${info.Author}\n`;
      if (info.Subject) metadataText += `Subject: ${info.Subject}\n`;
      if (info.Keywords) metadataText += `Keywords: ${info.Keywords}\n`;
      if (info.Creator) metadataText += `Creator: ${info.Creator}\n`;

      if (metadataText) {
        formattedText += `\n--- PDF METADATA ---\n${metadataText}--- END METADATA ---\n`;
        totalTextLength += metadataText.length;
        console.log('Added PDF metadata:', metadataText);
      }
    }

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

    const metadataLength = metadataText.length;
    const contentLength = totalTextLength - metadataLength;

    console.log(`Total extraction: ${totalTextLength} characters (${metadataLength} metadata, ${contentLength} content) from ${totalPages} pages`);

    const hasMinimalText = contentLength < 50;

    if (hasMinimalText) {
      console.warn(`PDF appears to be image-based with minimal extractable text (${contentLength} chars of actual content).`);

      let limitedText = formattedText || '';

      if (contentLength === 0) {
        limitedText = `${metadataText}\n\n⚠️ IMAGE-BASED DECK: This PDF contains ${totalPages} slides that appear to be image-based (graphics/screenshots). ` +
          `Text extraction yielded minimal content. Visual analysis through slide images is required for comprehensive feedback. ` +
          `The AI will provide preliminary analysis based on available metadata and any extractable text, but detailed feedback ` +
          `requires the analyze-slides function to process uploaded slide images.`;
      }

      return {
        text: limitedText.trim(),
        pageCount: totalPages,
        pages: pages.length > 0 ? pages : Array.from({ length: totalPages }, (_, i) => ({
          pageNumber: i + 1,
          text: ''
        })),
        metadata
      };
    }

    return {
      text: formattedText.trim(),
      pageCount: totalPages,
      pages,
      metadata
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error('Could not extract text from PDF. Please ensure the file is a valid, text-based PDF.');
  }
}