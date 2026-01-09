import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractTextFromPDF } from './pdfExtractor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into memory, extracting text...');
    
    const { text, pageCount } = await extractTextFromPDF(arrayBuffer);

    console.log(`Extracted ${text.length} characters from ${pageCount} pages`);

    console.log('Calling OpenAI for analysis...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert pitch deck analyst and venture capital advisor. Analyze pitch decks thoroughly and provide detailed, actionable feedback.'
          },
          {
            role: 'user',
            content: `Analyze this pitch deck content comprehensively. The deck has ${pageCount} pages.\n\nContent:\n${text.substring(0, 12000)}\n\nProvide your analysis in strict JSON format with these exact fields:\n- overallScore (number 0-100)\n- totalPages (number)\n- summary (string)\n- pages (array with pageNumber, title, score, content)\n- metrics (object with clarityScore, designScore, contentScore, structureScore - all numbers 0-100)\n- strengths (array of strings)\n- weaknesses (array of strings)\n- issues (array with pageNumber, priority, title, description)\n- improvements (array with pageNumber, priority, title, description)\n- missingSlides (array with priority, title, description, suggestedContent)\n\nReturn ONLY valid JSON, no markdown formatting.`
          }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}. Check if your API key is valid.`);
    }

    const openaiResult = await openaiResponse.json();
    
    if (!openaiResult.choices || !openaiResult.choices[0]) {
      console.error('Unexpected OpenAI response:', openaiResult);
      throw new Error('Unexpected response from OpenAI');
    }

    const content = openaiResult.choices[0].message.content;
    console.log('OpenAI response received, parsing...');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from response:', content);
      throw new Error('Could not parse analysis from OpenAI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('Creating analysis record...');

    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        file_name: file.name,
        file_size: file.size,
        overall_score: analysis.overallScore,
        total_pages: analysis.totalPages,
        summary: analysis.summary,
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error creating analysis:', analysisError);
      throw new Error(`Database error: ${analysisError.message}`);
    }

    const analysisId = analysisRecord.id;
    console.log('Analysis created with ID:', analysisId);

    if (analysis.pages && analysis.pages.length > 0) {
      await supabase.from('analysis_pages').insert(
        analysis.pages.map((page: any) => ({
          analysis_id: analysisId,
          page_number: page.pageNumber,
          title: page.title,
          score: page.score,
          content: page.content || null,
        }))
      );
    }

    if (analysis.metrics) {
      await supabase.from('analysis_metrics').insert({
        analysis_id: analysisId,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        clarity_score: analysis.metrics.clarityScore,
        design_score: analysis.metrics.designScore,
        content_score: analysis.metrics.contentScore,
        structure_score: analysis.metrics.structureScore,
      });
    }

    if (analysis.issues && analysis.issues.length > 0) {
      await supabase.from('analysis_issues').insert(
        analysis.issues.map((issue: any) => ({
          analysis_id: analysisId,
          page_number: issue.pageNumber || null,
          priority: issue.priority,
          title: issue.title,
          description: issue.description,
          type: 'issue',
        }))
      );
    }

    if (analysis.improvements && analysis.improvements.length > 0) {
      await supabase.from('analysis_issues').insert(
        analysis.improvements.map((improvement: any) => ({
          analysis_id: analysisId,
          page_number: improvement.pageNumber || null,
          priority: improvement.priority,
          title: improvement.title,
          description: improvement.description,
          type: 'improvement',
        }))
      );
    }

    if (analysis.missingSlides && analysis.missingSlides.length > 0) {
      await supabase.from('missing_slides').insert(
        analysis.missingSlides.map((slide: any) => ({
          analysis_id: analysisId,
          priority: slide.priority,
          title: slide.title,
          description: slide.description,
          suggested_content: slide.suggestedContent,
        }))
      );
    }

    console.log('Analysis complete:', analysisId);

    const result: AnalysisResult = {
      analysisId,
      overallScore: analysis.overallScore,
      summary: analysis.summary,
      totalPages: analysis.totalPages,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in analyze-deck function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});