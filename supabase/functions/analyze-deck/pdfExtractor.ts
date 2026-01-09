export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const uint8Array = new Uint8Array(arrayBuffer);
  const pdfText = new TextDecoder().decode(uint8Array);
  
  let text = '';
  let pageCount = 0;
  
  const streamMatch = pdfText.match(/\/Type\s*\/Page[^s]/g);
  if (streamMatch) {
    pageCount = streamMatch.length;
  }
  
  const textRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = textRegex.exec(pdfText)) !== null) {
    let extractedText = match[1];
    extractedText = extractedText.replace(/\\n/g, ' ');
    extractedText = extractedText.replace(/\\r/g, '');
    extractedText = extractedText.replace(/\\t/g, ' ');
    extractedText = extractedText.replace(/\\(/g, '(');
    extractedText = extractedText.replace(/\\)/g, ')');
    extractedText = extractedText.replace(/\\\\/g, '\\');
    
    if (extractedText.trim().length > 0) {
      text += extractedText + ' ';
    }
  }
  
  text = text.replace(/\s+/g, ' ').trim();
  
  if (text.length < 100) {
    const tjRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjRegex.exec(pdfText)) !== null) {
      const content = match[1];
      const stringMatches = content.match(/\(([^)]+)\)/g);
      if (stringMatches) {
        for (const str of stringMatches) {
          const cleaned = str.slice(1, -1).replace(/\\n/g, ' ');
          if (cleaned.trim().length > 0) {
            text += cleaned + ' ';
          }
        }
      }
    }
  }
  
  if (pageCount === 0) {
    pageCount = Math.max(1, Math.floor(text.length / 500));
  }
  
  return {
    text: text.trim(),
    pageCount: Math.max(1, pageCount)
  };
}