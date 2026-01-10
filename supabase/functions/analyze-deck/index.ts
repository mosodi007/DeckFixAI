import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { extractTextFromPDF } from './pdfExtractor.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisResult {
  analysisId: string;
  overallScore: number;
  summary: string;
  totalPages: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to Edge Function secrets.');
    }

    console.log('Environment check passed');
    console.log('OpenAI key present:', openaiKey ? `Yes (${openaiKey.substring(0, 7)}...)` : 'No');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('Authenticated user:', user.id);
      }
    }

    if (!user) {
      console.log('Anonymous user - creating analysis');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes');

    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported');
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into memory, size:', arrayBuffer.byteLength, 'bytes');
    console.log('Extracting text from PDF...');

    let text: string;
    let pageCount: number;
    let perPageWordCounts: { pageNumber: number; wordCount: number }[];
    let pdfMetadata: any;

    try {
      const result = await extractTextFromPDF(arrayBuffer);
      text = result.text;
      pageCount = result.pageCount;
      pdfMetadata = result.metadata;

      perPageWordCounts = result.pages.map(page => ({
        pageNumber: page.pageNumber,
        wordCount: page.text.trim().split(/\s+/).filter(w => w.length > 0).length
      }));

      console.log(`PDF extraction successful: ${text.length} characters from ${pageCount} pages`);
      console.log('PDF metadata:', pdfMetadata ? JSON.stringify(pdfMetadata.info) : 'None');
      console.log('Word counts per page:', perPageWordCounts.map(p => `Page ${p.pageNumber}: ${p.wordCount} words`).join(', '));
    } catch (pdfError: any) {
      console.error('PDF extraction failed:', pdfError);
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
    }

    const maxChars = 25000;
    const textToAnalyze = text.substring(0, maxChars);
    console.log('Preparing OpenAI request (text-only analysis)...');
    console.log('Text length to send:', textToAnalyze.length, 'chars');

    const wordCountSummary = perPageWordCounts.map(p => `Page ${p.pageNumber}: ${p.wordCount} words`).join(', ');
    const isImageBased = text.includes('IMAGE-BASED DECK') || text.includes('image-based and requires visual analysis');

    const totalWords = perPageWordCounts.reduce((sum, p) => sum + p.wordCount, 0);
    const avgWordsPerPage = pageCount > 0 ? Math.round(totalWords / pageCount) : 0;
    console.log(`Total words: ${totalWords}, Average per page: ${avgWordsPerPage}`);

    const analysisId = crypto.randomUUID();
    console.log('Analysis ID created:', analysisId);

    const analysisRecord = {
      id: analysisId,
      user_id: user?.id || null,
      session_id: !user?.id ? sessionId : null,
      file_name: file.name,
      file_size: file.size,
      overall_score: 0,
      summary: 'Analysis in progress...',
      total_pages: pageCount,
      created_at: new Date().toISOString(),
    };

    console.log('Inserting analysis record:', analysisRecord);
    const { error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisRecord);

    if (analysisError) {
      console.error('Failed to insert analysis:', analysisError);
      throw new Error(`Failed to save analysis: ${analysisError.message}`);
    }

    console.log('Analysis record inserted');

    console.log('Creating analysis_pages records...');
    const pageRecords = Array.from({ length: pageCount }, (_, i) => ({
      analysis_id: analysisId,
      page_number: i + 1,
      image_url: null,
    }));

    const { error: pagesError } = await supabase
      .from('analysis_pages')
      .insert(pageRecords);

    if (pagesError) {
      console.error('Failed to insert pages:', pagesError);
    } else {
      console.log(`Created ${pageCount} page records`);
    }

    const result: AnalysisResult = {
      analysisId,
      overallScore: 0,
      summary: 'Analysis started successfully',
      totalPages: pageCount,
    };

    console.log('Returning initial result:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-deck function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});