/**
 * Image Analyzer for PDF Pages
 * Downloads images from URLs and converts them to base64 for OpenAI Vision API
 */

export interface ImageAnalysisResult {
  pageNumber: number;
  textContent: string;
  visualDescription: string;
  combinedContent: string;
}

/**
 * Download image from URL and convert to base64
 */
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);
    
    // Determine image type from URL or response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0];
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error: any) {
    console.error(`Error converting image to base64:`, error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Analyze a single page image using OpenAI Vision API
 */
async function analyzePageImage(
  imageBase64: string,
  pageNumber: number,
  apiKey: string
): Promise<{ textContent: string; visualDescription: string }> {
  // Validate API key before making request
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key is empty or invalid');
  }
  
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
  
  console.log(`Making OpenAI Vision API request for page ${pageNumber} with API key length: ${apiKey.length}`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Use GPT-4o for vision capabilities
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting and analyzing content from pitch deck slides. Your job is to extract EVERY piece of text visible in the image with 100% accuracy. This includes: headings, subheadings, body text, bullet points, numbers, percentages, dollar amounts, dates, names, company names, metrics, chart labels, axis labels, legends, footnotes, and any other visible text. Preserve the exact wording and formatting. Also provide a detailed visual description of layout, design elements, charts, graphs, images, colors, and visual hierarchy.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text content from this pitch deck slide (Page ${pageNumber}). Be extremely thorough - include every single word, number, percentage, dollar amount, date, name, and piece of text visible on the slide. Do not summarize or paraphrase - extract the exact text as it appears. Also provide a detailed description of:
- Visual layout and structure
- Design elements (colors, fonts, spacing)
- Charts, graphs, and data visualizations (including all labels, axes, legends)
- Images, icons, or graphics
- Visual hierarchy and emphasis
- Overall design quality and professionalism

Return your response as JSON with two fields:
- "textContent": All extracted text exactly as it appears, preserving structure
- "visualDescription": Detailed description of visual elements and design`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'high' // Use high detail for better text extraction
              }
            }
          ]
        }
      ],
      temperature: 0.1 // Low temperature for accurate text extraction
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`OpenAI Vision API error for page ${pageNumber}:`, error);
    console.error('Response status:', response.status);
    
    // Check if it's an auth error
    if (response.status === 401) {
      console.error('OpenAI Vision API returned 401 - checking API key...');
      console.error('API key present:', !!apiKey);
      console.error('API key length:', apiKey?.length || 0);
      console.error('API key starts with sk-:', apiKey?.startsWith('sk-') || false);
      throw new Error('OpenAI Vision API authentication failed. Please verify OPENAI_API_KEY is correctly set in Supabase Edge Function secrets.');
    }
    
    throw new Error(`OpenAI Vision API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(content);
    return {
      textContent: parsed.textContent || content,
      visualDescription: parsed.visualDescription || ''
    };
  } catch {
    // If not JSON, return the content as text
    return {
      textContent: content,
      visualDescription: ''
    };
  }
}

/**
 * Analyze all PDF page images using OpenAI Vision API
 */
export async function analyzePDFImages(
  imageUrls: string[],
  apiKey: string
): Promise<ImageAnalysisResult[]> {
  console.log(`Starting Vision API analysis for ${imageUrls.length} pages`);
  
  const results: ImageAnalysisResult[] = [];
  
  // Process images in batches to avoid rate limits
  const BATCH_SIZE = 3; // Process 3 images at a time
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
  
  for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
    const batch = imageUrls.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: pages ${i + 1} to ${Math.min(i + BATCH_SIZE, imageUrls.length)}`);
    
    const batchPromises = batch.map(async (imageUrl, batchIndex) => {
      const pageNumber = i + batchIndex + 1;
      try {
        // Convert image to base64
        const imageBase64 = await imageUrlToBase64(imageUrl);
        console.log(`Page ${pageNumber}: Image converted to base64 (${Math.round(imageBase64.length / 1024)}KB)`);
        
        // Analyze with Vision API
        const analysis = await analyzePageImage(imageBase64, pageNumber, apiKey);
        console.log(`Page ${pageNumber}: Extracted ${analysis.textContent.length} characters of text`);
        
        return {
          pageNumber,
          textContent: analysis.textContent,
          visualDescription: analysis.visualDescription,
          combinedContent: `${analysis.textContent}\n\nVisual Elements: ${analysis.visualDescription}`
        };
      } catch (error: any) {
        console.error(`Error analyzing page ${pageNumber}:`, error);
        // Return empty result but continue processing
        return {
          pageNumber,
          textContent: '',
          visualDescription: '',
          combinedContent: ''
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + BATCH_SIZE < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log(`Vision API analysis complete. Extracted text from ${results.filter(r => r.textContent.length > 0).length} pages`);
  
  return results;
}

