import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Calling OpenAI for PDF analysis...');

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
            content: `You are an expert pitch deck analyst and venture capital advisor. Analyze pitch decks thoroughly and provide detailed, actionable feedback. Focus on:

1. Overall Structure & Flow
2. Content Quality & Completeness
3. Visual Design & Clarity
4. Investment Readiness
5. Missing Critical Elements

Provide scores from 0-100 and specific, constructive feedback.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this pitch deck PDF comprehensively. Provide your analysis in the following JSON format:

{
  "overallScore": <number 0-100>,
  "totalPages": <number>,
  "summary": "<executive summary>",
  "pages": [
    {"pageNumber": <number>, "title": "<title>", "score": <0-100>, "content": "<brief description>"}
  ],
  "metrics": {
    "clarityScore": <0-100>,
    "designScore": <0-100>,
    "contentScore": <0-100>,
    "structureScore": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "issues": [
    {"priority": "High|Medium|Low", "title": "<issue>", "description": "<details>", "pageNumber": <number>}
  ],
  "improvements": [
    {"priority": "High|Medium|Low", "title": "<suggestion>", "description": "<impact>", "pageNumber": <number>}
  ],
  "missingSlides": [
    {"priority": "High|Medium|Low", "title": "<slide name>", "description": "<why needed>", "suggestedContent": "<what to include>"}
  ]
}

Be specific and actionable in your feedback.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0].message.content;
    
    console.log('OpenAI response:', content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from OpenAI response');
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
      throw analysisError;
    }

    const analysisId = analysisRecord.id;

    console.log('Inserting pages...');
    if (analysis.pages && analysis.pages.length > 0) {
      const { error: pagesError } = await supabase
        .from('analysis_pages')
        .insert(
          analysis.pages.map((page: any) => ({
            analysis_id: analysisId,
            page_number: page.pageNumber,
            title: page.title,
            score: page.score,
            content: page.content || null,
          }))
        );

      if (pagesError) {
        console.error('Error inserting pages:', pagesError);
      }
    }

    console.log('Inserting metrics...');
    if (analysis.metrics) {
      const { error: metricsError } = await supabase
        .from('analysis_metrics')
        .insert({
          analysis_id: analysisId,
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          clarity_score: analysis.metrics.clarityScore,
          design_score: analysis.metrics.designScore,
          content_score: analysis.metrics.contentScore,
          structure_score: analysis.metrics.structureScore,
        });

      if (metricsError) {
        console.error('Error inserting metrics:', metricsError);
      }
    }

    console.log('Inserting issues...');
    if (analysis.issues && analysis.issues.length > 0) {
      const { error: issuesError } = await supabase
        .from('analysis_issues')
        .insert(
          analysis.issues.map((issue: any) => ({
            analysis_id: analysisId,
            page_number: issue.pageNumber || null,
            priority: issue.priority,
            title: issue.title,
            description: issue.description,
            type: 'issue',
          }))
        );

      if (issuesError) {
        console.error('Error inserting issues:', issuesError);
      }
    }

    console.log('Inserting improvements...');
    if (analysis.improvements && analysis.improvements.length > 0) {
      const { error: improvementsError } = await supabase
        .from('analysis_issues')
        .insert(
          analysis.improvements.map((improvement: any) => ({
            analysis_id: analysisId,
            page_number: improvement.pageNumber || null,
            priority: improvement.priority,
            title: improvement.title,
            description: improvement.description,
            type: 'improvement',
          }))
        );

      if (improvementsError) {
        console.error('Error inserting improvements:', improvementsError);
      }
    }

    console.log('Inserting missing slides...');
    if (analysis.missingSlides && analysis.missingSlides.length > 0) {
      const { error: missingError } = await supabase
        .from('missing_slides')
        .insert(
          analysis.missingSlides.map((slide: any) => ({
            analysis_id: analysisId,
            priority: slide.priority,
            title: slide.title,
            description: slide.description,
            suggested_content: slide.suggestedContent,
          }))
        );

      if (missingError) {
        console.error('Error inserting missing slides:', missingError);
      }
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