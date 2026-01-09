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
    console.log('OpenAI key present:', openaiKey ? `Yes (${openaiKey.substring(0, 7)}...)` : 'No');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Size:', file.size);

    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into memory, size:', arrayBuffer.byteLength, 'bytes');
    console.log('Extracting text from PDF...');

    let text: string;
    let pageCount: number;

    try {
      const result = await extractTextFromPDF(arrayBuffer);
      text = result.text;
      pageCount = result.pageCount;
      console.log(`✓ PDF extraction successful: ${text.length} characters from ${pageCount} pages`);
      console.log('First 200 chars:', text.substring(0, 200));
    } catch (pdfError) {
      console.error('PDF extraction failed:', pdfError);
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
    }

    const maxChars = 25000;
    const textToAnalyze = text.substring(0, maxChars);
    console.log('Preparing OpenAI request...');
    console.log('Text length to send:', textToAnalyze.length, 'chars');

    const prompt = `You are an expert pitch deck analyst and venture capital advisor. Analyze this ${pageCount}-page pitch deck thoroughly.

## DECK CONTENT:
${textToAnalyze}

## ANALYSIS INSTRUCTIONS:

Provide a comprehensive analysis in strict JSON format. Be accurate and specific based on the actual content.

### SCORING CRITERIA (0-100 scale):

**Clarity Score (0-100):**
- 90-100: Crystal clear messaging, perfect flow, instantly understandable
- 70-89: Clear with minor ambiguities, good logical flow
- 50-69: Somewhat clear but requires effort to understand, inconsistent flow
- 30-49: Confusing messaging, poor flow, hard to follow
- 0-29: Very unclear, incoherent, or missing critical information

Evaluate: Message clarity, logical flow, coherence, ease of understanding, consistency

**Design Score (0-100):**
- 90-100: Professional, visually stunning, excellent hierarchy, consistent branding
- 70-89: Good design with minor inconsistencies, professional appearance
- 50-69: Adequate design but lacks polish, some inconsistencies
- 30-49: Poor design choices, inconsistent, unprofessional
- 0-29: Very poor design, no visual hierarchy, hard to read

Evaluate: Visual appeal, consistency, hierarchy, readability, professional quality

**Content Score (0-100):**
- 90-100: Comprehensive, compelling story, excellent data, all key points covered
- 70-89: Strong content with minor gaps, good supporting data
- 50-69: Adequate content but missing important elements
- 30-49: Weak content, significant gaps, insufficient data
- 0-29: Poor content, major gaps, lacks substance

Evaluate: Completeness, data quality, storytelling, evidence, key information presence

**Structure Score (0-100):**
- 90-100: Perfect slide order, optimal pacing, excellent narrative arc
- 70-89: Good structure with minor ordering issues
- 50-69: Acceptable structure but could be reorganized
- 30-49: Poor structure, illogical flow, missing key sections
- 0-29: Very poor structure, random order, critical sections missing

Evaluate: Slide order, narrative flow, section organization, pacing, completeness

### OVERALL SCORE:
Calculate as weighted average:
- Content: 35%
- Clarity: 25%
- Structure: 25%
- Design: 15%

Be critical but fair. Most real pitch decks score 60-75.

### PAGE ANALYSIS:
For EACH page in the deck (1 to ${pageCount}), provide:
- pageNumber: actual page number
- title: page heading or inferred topic
- score: individual page quality (0-100)
- content: brief summary of page content

### IDENTIFY ISSUES:
List specific problems found:
- pageNumber: which page has the issue (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: brief issue name
- description: detailed explanation

### SUGGEST IMPROVEMENTS:
Provide actionable recommendations:
- pageNumber: which page to improve (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: brief improvement name
- description: specific action to take

### IDENTIFY MISSING SLIDES:
List critical missing content:
- priority: "high", "medium", or "low"
- title: slide name
- description: why it's needed
- suggestedContent: what should be included

## REQUIRED JSON FORMAT:

{
  "overallScore": <number 0-100>,
  "totalPages": ${pageCount},
  "summary": "<3-4 sentence executive summary>",
  "pages": [
    {"pageNumber": 1, "title": "<title>", "score": <0-100>, "content": "<brief summary>"},
    ...
  ],
  "metrics": {
    "clarityScore": <0-100>,
    "designScore": <0-100>,
    "contentScore": <0-100>,
    "structureScore": <0-100>
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", ...],
  "issues": [
    {"pageNumber": <number or null>, "priority": "high/medium/low", "title": "<title>", "description": "<details>"},
    ...
  ],
  "improvements": [
    {"pageNumber": <number or null>, "priority": "high/medium/low", "title": "<title>", "description": "<details>"},
    ...
  ],
  "missingSlides": [
    {"priority": "high/medium/low", "title": "<slide name>", "description": "<why needed>", "suggestedContent": "<what to include>"},
    ...
  ]
}

Return ONLY valid JSON, no markdown formatting or code blocks.`;

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
            content: 'You are an expert pitch deck analyst and venture capital advisor with 15+ years of experience. You provide thorough, accurate, and actionable feedback. You are detail-oriented and base your analysis strictly on the actual content provided.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    console.log('OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorData);

      if (openaiResponse.status === 401) {
        throw new Error('OpenAI API key is invalid or not configured. Please check the OPENAI_API_KEY secret in Supabase Edge Functions settings.');
      }

      throw new Error(`OpenAI API error: ${openaiResponse.status}. ${errorData}`);
    }

    const openaiResult = await openaiResponse.json();
    
    if (!openaiResult.choices || !openaiResult.choices[0]) {
      console.error('Unexpected OpenAI response:', openaiResult);
      throw new Error('Unexpected response from OpenAI');
    }

    const content = openaiResult.choices[0].message.content;
    console.log('OpenAI response received, parsing...');
    console.log('Response preview:', content.substring(0, 500));

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from response:', content);
      throw new Error('Could not parse analysis from OpenAI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('Analysis parsed successfully');
    console.log('Overall score:', analysis.overallScore);
    console.log('Metrics:', analysis.metrics);

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
      const pagesData = analysis.pages.map((page: any) => ({
        analysis_id: analysisId,
        page_number: page.pageNumber,
        title: page.title,
        score: page.score,
        content: page.content || null,
      }));
      console.log(`Inserting ${pagesData.length} pages`);
      await supabase.from('analysis_pages').insert(pagesData);
    }

    if (analysis.metrics) {
      console.log('Inserting metrics:', analysis.metrics);
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
      console.log(`Inserting ${analysis.issues.length} issues`);
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
      console.log(`Inserting ${analysis.improvements.length} improvements`);
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
      console.log(`Inserting ${analysis.missingSlides.length} missing slides`);
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