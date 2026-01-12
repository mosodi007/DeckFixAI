import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Dynamic CORS headers
function getAllowedOrigin(origin: string | null): string {
  const allowedOrigins = [
    'https://deckfix.ai',
    'https://www.deckfix.ai',
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.includes('localhost'))) {
    return origin;
  }
  return 'https://deckfix.ai';
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIKey = Deno.env.get('OPENAI_API_KEY');

  if (!openAIKey || !openAIKey.startsWith('sk-')) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request with better error handling
    let body: any;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: `Invalid JSON: ${parseError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { analysisId, pageNumber, imageUrl } = body;

    if (!analysisId || !pageNumber || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields: analysisId, pageNumber, imageUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing page ${pageNumber} for analysis ${analysisId}...`);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user?.id || authError) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call OpenAI Vision API for single page with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`OpenAI API request timed out for page ${pageNumber}`)), 25000);
    });
    
    const fetchPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text from this pitch deck slide (page ${pageNumber}). 
              
IMPORTANT: 
- Extract text even if it overlaps with images or other elements
- Read text in all orientations (horizontal, vertical, diagonal)
- Include text from charts, graphs, diagrams, and annotations
- If text is partially obscured, extract what you can see
- Preserve the order and structure of the text

Return JSON: {"textContent": "all extracted text in reading order", "visualDescription": "brief description of visual elements and layout"}`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      const errorMessage = error.substring(0, 200);
      
      // Handle rate limits specifically
      if (response.status === 429) {
        console.error(`Page ${pageNumber} rate limited by OpenAI API`);
        throw new Error(`OpenAI Vision API error: 429`);
      }
      
      // Only log non-rate-limit errors
      if (response.status !== 429) {
        console.error(`Page ${pageNumber} Vision API error:`, response.status, errorMessage);
      }
      throw new Error(`OpenAI Vision API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';
    
    let textContent = '';
    let visualDescription = '';
    
    // Clean up the content - remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '').trim();
    }
    
    // Try to parse as JSON
    try {
      // Remove any leading/trailing whitespace or newlines
      content = content.trim();
      
      // If content starts with non-JSON characters, try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const parsed = JSON.parse(content);
      textContent = parsed.textContent || content || '';
      visualDescription = parsed.visualDescription || '';
      
      // If parsing succeeded but fields are empty, use the raw content
      if (!textContent && content) {
        textContent = content;
      }
    } catch (parseError: any) {
      console.error(`JSON parse error for page ${pageNumber}:`, parseError.message);
      console.error(`Content preview:`, content.substring(0, 200));
      
      // Fallback: try to extract text from the raw content
      // Sometimes OpenAI returns plain text even with json_object format
      if (content && content.length > 0) {
        textContent = content;
        // Try to extract visual description if it's in the text
        const visualMatch = content.match(/visual[:\s]+(.+)/i);
        if (visualMatch) {
          visualDescription = visualMatch[1];
        }
      } else {
        textContent = `[Unable to extract text from page ${pageNumber}]`;
      }
    }

    // Store page result in database
    const { error: insertError } = await supabase
      .from('analysis_pages')
      .upsert({
        analysis_id: analysisId,
        page_number: pageNumber,
        title: `Slide ${pageNumber}`,
        content: textContent,
        score: 0, // Will be calculated in finalize step
        feedback: '',
        image_url: imageUrl,
        thumbnail_url: imageUrl,
      }, {
        onConflict: 'analysis_id,page_number'
      });

    if (insertError) {
      console.error(`Failed to store page ${pageNumber}:`, insertError);
      throw new Error(`Failed to store page result: ${insertError.message}`);
    }

    console.log(`Page ${pageNumber} analyzed and stored successfully`);

    return new Response(JSON.stringify({
      success: true,
      pageNumber,
      content: textContent,
      visualDescription,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error analyzing page:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze page',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

