export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
}> {
  const pdfParse = (await import('npm:pdf-parse@1.1.1')).default;

  const buffer = new Uint8Array(arrayBuffer);

  const data = await pdfParse(buffer, {
    max: 0,
  });

  const pageCount = data.numpages;
  const fullText = data.text;

  const estimatedTextPerPage = fullText.length / pageCount;
  const pages: Array<{ pageNumber: number; text: string }> = [];

  const lines = fullText.split('\n');
  const linesPerPage = Math.ceil(lines.length / pageCount);

  for (let i = 0; i < pageCount; i++) {
    const startLine = i * linesPerPage;
    const endLine = Math.min((i + 1) * linesPerPage, lines.length);
    const pageText = lines.slice(startLine, endLine).join('\n');

    pages.push({
      pageNumber: i + 1,
      text: pageText.trim(),
    });
  }

  return {
    text: fullText,
    pageCount,
    pages,
  };
}