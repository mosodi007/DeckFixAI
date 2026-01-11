export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
}> {
  const pdfjsLib = await import('npm:pdfjs-dist@4.9.155');

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const pages: Array<{ pageNumber: number; text: string }> = [];
  let fullText = '';

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    pages.push({
      pageNumber: i,
      text: pageText,
    });

    fullText += pageText + '\n\n';
  }

  return {
    text: fullText,
    pageCount,
    pages,
  };
}