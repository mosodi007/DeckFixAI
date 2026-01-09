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
    const providedAnalysisId = formData.get('analysisId') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Size:', file.size);
    console.log('Analysis ID:', providedAnalysisId || 'will be generated');

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
      console.log('Extracted pages:', result.pages.map(p => `Page ${p.pageNumber}: ${p.text.substring(0, 50)}...`));
    } catch (pdfError) {
      console.error('PDF extraction failed:', pdfError);
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
    }

    const maxChars = 25000;
    const textToAnalyze = text.substring(0, maxChars);
    console.log('Preparing OpenAI request (text-only analysis)...');
    console.log('Text length to send:', textToAnalyze.length, 'chars');

    const prompt = `You are an experienced VC analyzing this ${pageCount}-page pitch deck based on the text content. Be direct and honest.

## DECK CONTENT:
${textToAnalyze}

## INSTRUCTIONS:
Provide analysis in strict JSON format. Be concise and specific.

### STEP 1: DETECT FUNDING STAGE

Based on the content, determine the funding stage:
- **Pre-Seed**: Idea stage, no/minimal revenue, early prototype
- **Seed**: MVP built, early traction, <$100K ARR, need product-market fit
- **Series A**: Proven product-market fit, $1M+ ARR, scaling playbook needed
- **Series B+**: Significant revenue ($10M+ ARR), proven unit economics, market expansion

Provide: detected_stage, stage_confidence (high/medium/low), stage_appropriateness_score (0-100)

### STEP 2: INVESTMENT READINESS

Score 5 dimensions (0-100 each):
- **Team**: Founder quality, experience, completeness
- **Market**: TAM size, growth, accessibility
- **Product**: Solution strength, differentiation, moat
- **Traction**: Revenue, users, partnerships, metrics
- **Financials**: Projections quality, burn rate, use of funds

**Readiness Score** = average of 5 scores
**is_investment_ready** = true if score >= 70 AND no deal-breakers

### STEP 3: RED FLAGS
List major concerns (category, severity, title, description, impact)

### STEP 4: DEAL-BREAKERS
List critical issues that make deck uninvestable (title, description, recommendation)

### STEP 5: STAGE FEEDBACK
Brief guidance for detected funding stage

### STEP 6: STANDARD SCORING (for UI display)

**Clarity Score (0-100):** Message clarity, flow, ease of understanding
**Design Score (0-100):** Visual quality, consistency, professionalism
**Content Score (0-100):** Completeness, data quality, storytelling
**Structure Score (0-100):** Slide order, narrative flow, pacing

Calculate **Overall Score** as weighted average:
- Readiness Score: 40%
- Content: 25%
- Clarity: 20%
- Structure: 15%

Be harsh. Average real decks should score 50-65. Only truly excellent, investor-ready decks score 80+.

### PAGE ANALYSIS:
For EACH page in the deck (1 to ${pageCount}):

- pageNumber: actual page number
- title: Slide title/heading (e.g., "Cover", "Problem", "Solution", "Market", "Team", "Financials")
- score: 0-100 (be harsh, most slides score 40-70)
- content: 1-2 sentence summary
- feedback: 2-3 sentences of direct VC feedback on what's weak/missing
- recommendations: Array of 2-3 specific actions to improve (keep brief)
- idealVersion: 1 sentence describing what a perfect version would include

### IDENTIFY ISSUES:
List specific problems found (diagnostic):
- pageNumber: which page has the issue (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: brief issue name
- description: what's wrong and why it matters

### SUGGEST IMPROVEMENTS:
Provide 5-8 actionable improvements:
- pageNumber: which page (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: Brief action title
- description: Specific action to take (1-2 sentences)

### IDENTIFY MISSING SLIDES:
List critical missing content:
- priority: "high", "medium", or "low"
- title: slide name
- description: why it's needed
- suggestedContent: what should be included

### EXTRACT KEY BUSINESS METRICS:
Extract the following business metrics from the deck content. If a metric is not explicitly stated, write "Not specified":
- companyName: Company name (string)
- industry: Industry/sector (string)
- currentRevenue: Current revenue/ARR (string with units, e.g., "$2M ARR", "Not specified")
- fundingSought: Amount of funding sought (string with units, e.g., "$5M Series A", "Not specified")
- growthRate: Growth rate (string with %, e.g., "150% YoY", "Not specified")
- teamSize: Number of team members (number, use 0 if not specified)
- marketSize: Total addressable market (string with units, e.g., "$50B TAM", "Not specified")
- valuation: Current or pre-money valuation (string, e.g., "$15M pre-money", "Not specified")
- businessModel: Revenue/business model (string, e.g., "SaaS subscription", "Not specified")
- customerCount: Number of customers/users (string, e.g., "10K users", "500 enterprise customers", "Not specified")

### ASSESS DECK QUALITY METRICS:
Analyze these additional quality metrics:
- wordDensity: Assessment of text density per slide. Return one of: "Low" (minimal text, mostly visuals), "Medium" (balanced text and visuals), "High" (text-heavy but readable), "Very High" (overwhelming text, slides too busy)
- wordDensityFeedback: 2-3 sentences explaining the word density assessment, what you observed, and recommendations if needed
- disruptionSignal: Score 0-100 measuring how disruptive/innovative the business idea is. Consider: market disruption potential, technology innovation, business model novelty, addressable pain points. Score 0-30: incremental improvement, 31-60: moderate innovation, 61-80: significant disruption potential, 81-100: revolutionary/paradigm-shifting
- disruptionSignalFeedback: 2-3 sentences explaining the disruption score, what makes it innovative or not, competitive landscape considerations
- pageCountFeedback: 2-3 sentences assessing if the page count is appropriate for the stage and content depth, recommendations for optimal length

### BUSINESS SUMMARY:
Write a concise summary (100-150 words) covering:
- Problem/solution
- Key metrics
- Investment readiness verdict
- Critical gaps

## REQUIRED JSON FORMAT:

{
  "overallScore": <number 0-100>,
  "totalPages": ${pageCount},
  "summary": "<100-150 word business summary>",
  "stageAssessment": {
    "detectedStage": "Pre-Seed|Seed|Series A|Series B+",
    "stageConfidence": "high|medium|low",
    "stageAppropriatenessScore": <0-100>,
    "stageFeedback": "<stage-specific recommendations and expectations>"
  },
  "investmentReadiness": {
    "isInvestmentReady": <boolean>,
    "readinessScore": <0-100>,
    "readinessSummary": "<direct assessment of investment readiness>",
    "criticalBlockers": ["<blocker 1>", "<blocker 2>", ...],
    "teamScore": <0-100>,
    "marketOpportunityScore": <0-100>,
    "productScore": <0-100>,
    "tractionScore": <0-100>,
    "financialsScore": <0-100>
  },
  "redFlags": [
    {
      "category": "financial|team|market|product|competition|traction|other",
      "severity": "critical|major|moderate",
      "title": "<red flag name>",
      "description": "<what's wrong>",
      "impact": "<funding impact>"
    },
    ...
  ],
  "dealBreakers": [
    {
      "title": "<deal-breaker>",
      "description": "<why this is uninvestable>",
      "recommendation": "<what must be fixed>"
    },
    ...
  ],
  "pages": [
    {
      "pageNumber": 1,
      "title": "<title>",
      "score": <0-100>,
      "content": "<1-2 sentences>",
      "feedback": "<2-3 sentences>",
      "recommendations": ["<action 1>", "<action 2>"],
      "idealVersion": "<1 sentence>"
    }
  ],
  "metrics": {
    "clarityScore": <0-100>,
    "designScore": <0-100>,
    "contentScore": <0-100>,
    "structureScore": <0-100>
  },
  "keyMetrics": {
    "companyName": "<string>",
    "industry": "<string>",
    "currentRevenue": "<string>",
    "fundingSought": "<string>",
    "growthRate": "<string>",
    "teamSize": <number>,
    "marketSize": "<string>",
    "valuation": "<string>",
    "businessModel": "<string>",
    "customerCount": "<string>"
  },
  "deckQualityMetrics": {
    "wordDensity": "Low|Medium|High|Very High",
    "wordDensityFeedback": "<2-3 sentences explaining word density>",
    "disruptionSignal": <0-100>,
    "disruptionSignalFeedback": "<2-3 sentences explaining disruption potential>",
    "pageCountFeedback": "<2-3 sentences about page count appropriateness>"
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", ...],
  "issues": [
    {"pageNumber": <number or null>, "priority": "high|medium|low", "title": "<title>", "description": "<details>"},
    ...
  ],
  "improvements": [
    {"pageNumber": <number or null>, "priority": "high|medium|low", "title": "<title>", "description": "<description>"}
  ],
  "missingSlides": [
    {"priority": "high|medium|low", "title": "<title>", "description": "<description>", "suggestedContent": "<content>"}
  ]
}

CRITICAL: Return ONLY the JSON object above. No explanations, no markdown, no code blocks. Start with { and end with }. If the response is getting too long, prioritize completing the JSON structure over adding more detail.`;

    // Text-only analysis for initial upload (fast and reliable)
    console.log('Calling OpenAI API for text-based analysis...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let openaiResponse;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are an expert pitch deck analyst and venture capital advisor with 15+ years of experience. You provide thorough, accurate, and actionable feedback. You are detail-oriented and base your analysis strictly on the actual text content provided.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 10000,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenAI request timed out after 90 seconds. Please try with a smaller deck or try again later.');
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    console.log('OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorData);

      if (openaiResponse.status === 401) {
        throw new Error('OpenAI API key is invalid or not configured. Please check the OPENAI_API_KEY secret in Supabase Edge Functions settings.');
      }

      if (openaiResponse.status === 502 || openaiResponse.status === 503 || openaiResponse.status === 504) {
        throw new Error('OpenAI API is temporarily unavailable (timeout or overloaded). This usually happens with large decks. Try again in a few moments, or contact support if the issue persists.');
      }

      if (openaiResponse.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorData || 'Unknown error'}`);
    }

    const openaiResult = await openaiResponse.json();

    if (!openaiResult.choices || !openaiResult.choices[0]) {
      console.error('Unexpected OpenAI response:', openaiResult);
      throw new Error('Unexpected response from OpenAI');
    }

    const finishReason = openaiResult.choices[0].finish_reason;
    console.log('OpenAI finish reason:', finishReason);

    if (finishReason === 'length') {
      console.warn('WARNING: OpenAI response was truncated due to token limit. Response may be incomplete.');
    }

    const content = openaiResult.choices[0].message.content;
    console.log('OpenAI response received, parsing...');
    console.log('Response length:', content.length, 'characters');
    console.log('Response preview:', content.substring(0, 500));
    console.log('Response ending:', content.substring(content.length - 500));

    let jsonString = content;

    if (content.includes('```json')) {
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1];
        console.log('Extracted JSON from markdown code block');
      }
    } else if (content.includes('```')) {
      const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
        console.log('Extracted JSON from generic code block');
      }
    }

    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find JSON in response. Full content length:', content.length);
      console.error('Content sample (first 2000 chars):', content.substring(0, 2000));
      console.error('Content sample (last 2000 chars):', content.substring(Math.max(0, content.length - 2000)));
      throw new Error('Could not parse analysis from OpenAI response. The response may be incomplete or in an unexpected format.');
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
      console.log('Analysis parsed successfully');
      console.log('Overall score:', analysis.overallScore);
      console.log('Metrics:', analysis.metrics);
      console.log('Key Metrics:', analysis.keyMetrics);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      console.error('JSON length:', jsonMatch[0].length);
      console.error('JSON start (500 chars):', jsonMatch[0].substring(0, 500));
      console.error('JSON end (500 chars):', jsonMatch[0].substring(Math.max(0, jsonMatch[0].length - 500)));

      if (finishReason === 'length') {
        let fixedJson = jsonMatch[0].trim();

        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;

        console.log('Attempting to fix truncated JSON...');
        console.log('Open/Close braces:', openBraces, '/', closeBraces);
        console.log('Open/Close brackets:', openBrackets, '/', closeBrackets);

        if (fixedJson.endsWith(',')) {
          fixedJson = fixedJson.slice(0, -1);
        }

        for (let i = 0; i < (openBrackets - closeBrackets); i++) {
          fixedJson += ']';
        }
        for (let i = 0; i < (openBraces - closeBraces); i++) {
          fixedJson += '}';
        }

        try {
          analysis = JSON.parse(fixedJson);
          console.log('Successfully fixed and parsed truncated JSON');
        } catch (fixError) {
          console.error('Failed to fix JSON:', fixError);
          throw new Error(`Failed to parse JSON (response was truncated): ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
    }

    const analysisData: any = {
      file_name: file.name,
      file_size: file.size,
      overall_score: analysis.overallScore,
      total_pages: analysis.totalPages,
      summary: analysis.summary,
      funding_stage: analysis.stageAssessment?.detectedStage || null,
      investment_ready: analysis.investmentReadiness?.isInvestmentReady || false,
      word_density: analysis.deckQualityMetrics?.wordDensity || 'Not analyzed',
      disruption_signal: analysis.deckQualityMetrics?.disruptionSignal || 0,
      word_density_feedback: analysis.deckQualityMetrics?.wordDensityFeedback || null,
      disruption_signal_feedback: analysis.deckQualityMetrics?.disruptionSignalFeedback || null,
      page_count_feedback: analysis.deckQualityMetrics?.pageCountFeedback || null,
    };

    if (providedAnalysisId) {
      analysisData.id = providedAnalysisId;
    }

    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisData)
      .select()
      .single();

    if (analysisError) {
      console.error('Error creating analysis:', analysisError);
      throw new Error(`Database error: ${analysisError.message}`);
    }

    const analysisId = analysisRecord.id;
    console.log('Analysis created with ID:', analysisId);

    // Construct image URLs from Supabase storage (images were uploaded separately)
    const { data: { publicUrl: storageBaseUrl } } = supabase.storage
      .from('slide-images')
      .getPublicUrl('dummy');
    const baseUrl = storageBaseUrl.replace('/dummy', '');

    if (analysis.pages && analysis.pages.length > 0) {
      const pagesData = analysis.pages.map((page: any) => {
        const imageUrl = `${baseUrl}/${analysisId}/page_${page.pageNumber}.jpg`;
        return {
          analysis_id: analysisId,
          page_number: page.pageNumber,
          title: page.title,
          score: page.score,
          content: page.content || null,
          feedback: page.feedback || null,
          recommendations: page.recommendations || [],
          ideal_version: page.idealVersion || null,
          image_url: imageUrl,
          thumbnail_url: imageUrl,
        };
      });
      console.log(`Inserting ${pagesData.length} pages with detailed feedback and image URLs`);
      console.log('Page numbers:', analysis.pages.map((p: any) => p.pageNumber));
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

    if (analysis.keyMetrics) {
      console.log('Inserting key business metrics:', analysis.keyMetrics);
      await supabase.from('key_business_metrics').insert({
        analysis_id: analysisId,
        company_name: analysis.keyMetrics.companyName || 'Not specified',
        industry: analysis.keyMetrics.industry || 'Not specified',
        current_revenue: analysis.keyMetrics.currentRevenue || 'Not specified',
        funding_sought: analysis.keyMetrics.fundingSought || 'Not specified',
        growth_rate: analysis.keyMetrics.growthRate || 'Not specified',
        team_size: analysis.keyMetrics.teamSize || 0,
        market_size: analysis.keyMetrics.marketSize || 'Not specified',
        valuation: analysis.keyMetrics.valuation || 'Not specified',
        business_model: analysis.keyMetrics.businessModel || 'Not specified',
        customer_count: analysis.keyMetrics.customerCount || 'Not specified',
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

    if (analysis.stageAssessment) {
      console.log('Inserting stage assessment:', analysis.stageAssessment);
      await supabase.from('analysis_stage_assessment').insert({
        analysis_id: analysisId,
        detected_stage: analysis.stageAssessment.detectedStage,
        stage_confidence: analysis.stageAssessment.stageConfidence,
        stage_appropriateness_score: analysis.stageAssessment.stageAppropriatenessScore,
        stage_specific_feedback: analysis.stageAssessment.stageFeedback,
      });
    }

    if (analysis.investmentReadiness) {
      console.log('Inserting investment readiness:', analysis.investmentReadiness);
      await supabase.from('analysis_investment_readiness').insert({
        analysis_id: analysisId,
        is_investment_ready: analysis.investmentReadiness.isInvestmentReady,
        readiness_score: analysis.investmentReadiness.readinessScore,
        readiness_summary: analysis.investmentReadiness.readinessSummary,
        critical_blockers: analysis.investmentReadiness.criticalBlockers || [],
        team_score: analysis.investmentReadiness.teamScore,
        market_opportunity_score: analysis.investmentReadiness.marketOpportunityScore,
        product_score: analysis.investmentReadiness.productScore,
        traction_score: analysis.investmentReadiness.tractionScore,
        financials_score: analysis.investmentReadiness.financialsScore,
      });
    }

    if (analysis.redFlags && analysis.redFlags.length > 0) {
      console.log(`Inserting ${analysis.redFlags.length} red flags`);
      await supabase.from('analysis_red_flags').insert(
        analysis.redFlags.map((flag: any) => ({
          analysis_id: analysisId,
          category: flag.category,
          severity: flag.severity,
          title: flag.title,
          description: flag.description,
          impact: flag.impact,
        }))
      );
    }

    if (analysis.dealBreakers && analysis.dealBreakers.length > 0) {
      console.log(`Inserting ${analysis.dealBreakers.length} deal breakers`);
      await supabase.from('analysis_deal_breakers').insert(
        analysis.dealBreakers.map((breaker: any) => ({
          analysis_id: analysisId,
          title: breaker.title,
          description: breaker.description,
          recommendation: breaker.recommendation,
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