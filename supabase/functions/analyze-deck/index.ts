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

interface OpenAIAnalysis {
  overallScore: number;
  summary: string;
  clarityScore: number;
  designScore: number;
  contentScore: number;
  structureScore: number;
  overallScoreFeedback: string;
  investmentGradeFeedback: string;
  fundingOddsFeedback: string;
  pageCountFeedback: string;
  wordDensityAssessment: string;
  wordDensityFeedback: string;
  strengths: string[];
  weaknesses: string[];
  issues: Array<{
    pageNumber: number | null;
    priority: 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
    type: 'issue' | 'improvement';
  }>;
  dealBreakers: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
  redFlags: Array<{
    category: 'financial' | 'team' | 'market' | 'product' | 'competition' | 'traction' | 'other';
    severity: 'critical' | 'major' | 'moderate';
    title: string;
    description: string;
    impact: string;
  }>;
  stageAssessment: {
    detectedStage: string;
    stageConfidence: 'high' | 'medium' | 'low';
    stageAppropriatenessScore: number;
    stageFeedback: string;
  };
  investmentReadiness: {
    isInvestmentReady: boolean;
    readinessScore: number;
    readinessSummary: string;
    criticalBlockers: string[];
    teamScore: number;
    marketOpportunityScore: number;
    productScore: number;
    tractionScore: number;
    financialsScore: number;
    teamFeedback: string;
    marketOpportunityFeedback: string;
    productFeedback: string;
    tractionFeedback: string;
    financialsFeedback: string;
  };
  keyBusinessMetrics: {
    companyName: string;
    industry: string;
    currentRevenue: string;
    fundingSought: string;
    growthRate: string;
    teamSize: number;
    marketSize: string;
    valuation: string;
    businessModel: string;
    customerCount: string;
  };
}

const ANALYSIS_PROMPT = `You are a senior VC partner with 15+ years of experience who has reviewed thousands of pitch decks and rejects 99% of them. You've seen every trick, every inflated claim, and every amateur mistake. Your job is to provide BRUTALLY HONEST feedback that reflects how real VCs think - not what founders want to hear, but what they NEED to hear before facing actual investors.

CRITICAL MINDSET: Assume this is YOUR money being invested. Be skeptical. Question everything. Call out BS. Don't sugarcoat. Founders pay for honesty, not encouragement.

Evaluate with HARSH VC standards:
- Problem/Solution: Is this a real problem worth solving? Is the solution actually differentiated or just another me-too product?
- Market: Is this a real opportunity or made-up TAM math? Do they understand their market or just reciting generalities?
- Business Model: Can this actually make money? Are unit economics believable or fantasy? Is CAC/LTV realistic?
- Team: Can they execute? Do they have relevant expertise or are they learning on investor dollars? Any red flags in backgrounds?
- Traction: Real proof points or vanity metrics? Revenue or just users? Growth trajectory believable?
- Financials: Are projections grounded in reality or hockey sticks with no basis? Do they know their numbers?
- Competition: Do they understand the landscape or claim "no competitors"? Why won't they get crushed?
- Story: Is the narrative compelling or confusing? Do they know what they're asking for and why?

Be direct, specific, and actionable. Call out weak arguments. Highlight missing information. No generic feedback. If something is mediocre, say it. If it's impressive, acknowledge it but explain why. Think like you're protecting your LP's capital.

Provide a thorough analysis including:
1. Overall assessment of investment readiness
2. Critical issues that need immediate attention
3. Deal-breaking red flags (if any)
4. Specific, actionable improvements for each slide
5. Missing information that investors will ask about

Return your analysis as a JSON object with this structure:
{
  "overallScore": <0-100>,
  "summary": "<2-3 sentence summary of the deck's viability>",
  "clarityScore": <0-100>,
  "designScore": <0-100>,
  "contentScore": <0-100>,
  "structureScore": <0-100>,
  "overallScoreFeedback": "<detailed explanation of the overall score>",
  "investmentGradeFeedback": "<honest assessment of investment grade>",
  "fundingOddsFeedback": "<realistic odds of getting funded with this deck>",
  "pageCountFeedback": "<feedback on deck length and structure>",
  "wordDensityAssessment": "<'Too Dense', 'Balanced', or 'Too Sparse'>",
  "wordDensityFeedback": "<specific feedback on text density>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", ...],
  "issues": [
    {
      "pageNumber": <number or null>,
      "priority": "High" | "Medium" | "Low",
      "title": "<issue title>",
      "description": "<detailed description>",
      "type": "issue" | "improvement"
    }
  ],
  "dealBreakers": [
    {
      "title": "<deal breaker title>",
      "description": "<why this is a deal breaker>",
      "recommendation": "<what to do about it>"
    }
  ],
  "redFlags": [
    {
      "category": "financial" | "team" | "market" | "product" | "competition" | "traction" | "other",
      "severity": "critical" | "major" | "moderate",
      "title": "<red flag title>",
      "description": "<detailed explanation>",
      "impact": "<impact on funding chances>"
    }
  ],
  "stageAssessment": {
    "detectedStage": "<Pre-Seed/Seed/Series A/etc.>",
    "stageConfidence": "high" | "medium" | "low",
    "stageAppropriatenessScore": <0-100>,
    "stageFeedback": "<is deck appropriate for this stage?>"
  },
  "investmentReadiness": {
    "isInvestmentReady": <boolean>,
    "readinessScore": <0-100>,
    "readinessSummary": "<one paragraph summary>",
    "criticalBlockers": ["<blocker 1>", "<blocker 2>", ...],
    "teamScore": <0-100>,
    "marketOpportunityScore": <0-100>,
    "productScore": <0-100>,
    "tractionScore": <0-100>,
    "financialsScore": <0-100>,
    "teamFeedback": "<detailed team assessment>",
    "marketOpportunityFeedback": "<detailed market assessment>",
    "productFeedback": "<detailed product assessment>",
    "tractionFeedback": "<detailed traction assessment>",
    "financialsFeedback": "<detailed financials assessment>"
  },
  "keyBusinessMetrics": {
    "companyName": "<name or 'Not specified'>",
    "industry": "<industry or 'Not specified'>",
    "currentRevenue": "<revenue or 'Not specified'>",
    "fundingSought": "<amount or 'Not specified'>",
    "growthRate": "<rate or 'Not specified'>",
    "teamSize": <number>,
    "marketSize": "<size or 'Not specified'>",
    "valuation": "<valuation or 'Not specified'>",
    "businessModel": "<model or 'Not specified'>",
    "customerCount": "<count or 'Not specified'>"
  }
}`;

async function analyzeWithOpenAI(text: string, pageCount: number): Promise<OpenAIAnalysis> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const prompt = `${ANALYSIS_PROMPT}

Pitch Deck Content (${pageCount} pages):
${text}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a senior VC partner providing brutally honest pitch deck analysis. Return only valid JSON with no markdown formatting or code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let analysis: OpenAIAnalysis;
  try {
    analysis = JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI analysis response');
  }

  return analysis;
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

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

    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    if (!contentType.includes('multipart/form-data')) {
      throw new Error(`Invalid content type: ${contentType}. Expected multipart/form-data`);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError: any) {
      console.error('Failed to parse form data:', formError);
      throw new Error(`Failed to parse form data: ${formError.message}`);
    }

    const file = formData.get('file') as File;
    const clientAnalysisId = formData.get('analysisId') as string;
    const imageUrlsJson = formData.get('imageUrls') as string;

    let imageUrls: string[] = [];
    try {
      imageUrls = imageUrlsJson ? JSON.parse(imageUrlsJson) : [];
    } catch (e) {
      console.warn('Failed to parse imageUrls:', e);
    }

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes');
    console.log('Image URLs received:', imageUrls.length);

    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported');
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into memory, size:', arrayBuffer.byteLength, 'bytes');

    let text: string;
    let pageCount: number;
    let pages: Array<{ pageNumber: number; text: string }>;

    try {
      const result = await extractTextFromPDF(arrayBuffer);
      text = result.text;
      pageCount = result.pageCount;
      pages = result.pages;
      console.log(`PDF extraction: ${text.length} characters from ${pageCount} pages`);
    } catch (pdfError: any) {
      console.error('PDF extraction failed:', pdfError);
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
    }

    const analysisId = clientAnalysisId || crypto.randomUUID();
    console.log('Analysis ID:', analysisId);

    if (!user?.id) {
      console.error('No authenticated user found. Auth header present:', !!authHeader);
      throw new Error('Authentication required. Please refresh the page and try again.');
    }

    console.log('Creating analysis for user:', user.id, 'Is anonymous:', user.is_anonymous);

    const analysisRecord = {
      id: analysisId,
      user_id: user.id,
      session_id: null,
      file_name: file.name,
      file_size: file.size,
      overall_score: 0,
      summary: 'Analyzing your pitch deck...',
      total_pages: pageCount,
      created_at: new Date().toISOString(),
    };

    const { error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisRecord);

    if (analysisError) {
      console.error('Failed to create analysis record:', analysisError);
      throw new Error(`Database error: ${analysisError.message}`);
    }

    console.log('Analysis record created, starting AI analysis...');

    const pageRecords = pages.map((page, index) => ({
      analysis_id: analysisId,
      page_number: page.pageNumber,
      title: `Slide ${page.pageNumber}`,
      content: page.text,
      score: 0,
      image_url: imageUrls[index] || null,
      thumbnail_url: imageUrls[index] || null,
    }));

    const { error: pagesError } = await supabase
      .from('analysis_pages')
      .insert(pageRecords);

    if (pagesError) {
      console.error('Failed to insert page records:', pagesError);
    }

    let openAIAnalysis: OpenAIAnalysis;
    try {
      openAIAnalysis = await analyzeWithOpenAI(text, pageCount);
      console.log('AI analysis completed successfully');
    } catch (aiError: any) {
      console.error('AI analysis failed:', aiError);
      throw new Error(`AI analysis failed: ${aiError.message}`);
    }

    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        overall_score: openAIAnalysis.overallScore,
        summary: openAIAnalysis.summary,
        overall_score_feedback: openAIAnalysis.overallScoreFeedback,
        investment_grade_feedback: openAIAnalysis.investmentGradeFeedback,
        funding_odds_feedback: openAIAnalysis.fundingOddsFeedback,
        page_count_feedback: openAIAnalysis.pageCountFeedback,
        word_density: openAIAnalysis.wordDensityAssessment,
        word_density_feedback: openAIAnalysis.wordDensityFeedback,
        investment_ready: openAIAnalysis.investmentReadiness.isInvestmentReady,
        funding_stage: openAIAnalysis.stageAssessment.detectedStage,
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Failed to update analysis:', updateError);
    }

    const { error: metricsError } = await supabase
      .from('analysis_metrics')
      .insert({
        analysis_id: analysisId,
        clarity_score: openAIAnalysis.clarityScore,
        design_score: openAIAnalysis.designScore,
        content_score: openAIAnalysis.contentScore,
        structure_score: openAIAnalysis.structureScore,
        strengths: openAIAnalysis.strengths,
        weaknesses: openAIAnalysis.weaknesses,
      });

    if (metricsError) {
      console.error('Failed to insert metrics:', metricsError);
    }

    if (openAIAnalysis.issues && openAIAnalysis.issues.length > 0) {
      const issueRecords = openAIAnalysis.issues.map(issue => ({
        analysis_id: analysisId,
        page_number: issue.pageNumber,
        priority: issue.priority,
        title: issue.title,
        description: issue.description,
        type: issue.type,
      }));

      const { error: issuesError } = await supabase
        .from('analysis_issues')
        .insert(issueRecords);

      if (issuesError) {
        console.error('Failed to insert issues:', issuesError);
      }
    }

    if (openAIAnalysis.keyBusinessMetrics) {
      const { error: keyMetricsError } = await supabase
        .from('key_business_metrics')
        .insert({
          analysis_id: analysisId,
          company_name: openAIAnalysis.keyBusinessMetrics.companyName,
          industry: openAIAnalysis.keyBusinessMetrics.industry,
          current_revenue: openAIAnalysis.keyBusinessMetrics.currentRevenue,
          funding_sought: openAIAnalysis.keyBusinessMetrics.fundingSought,
          growth_rate: openAIAnalysis.keyBusinessMetrics.growthRate,
          team_size: openAIAnalysis.keyBusinessMetrics.teamSize,
          market_size: openAIAnalysis.keyBusinessMetrics.marketSize,
          valuation: openAIAnalysis.keyBusinessMetrics.valuation,
          business_model: openAIAnalysis.keyBusinessMetrics.businessModel,
          customer_count: openAIAnalysis.keyBusinessMetrics.customerCount,
        });

      if (keyMetricsError) {
        console.error('Failed to insert key metrics:', keyMetricsError);
      }
    }

    if (openAIAnalysis.stageAssessment) {
      const { error: stageError } = await supabase
        .from('analysis_stage_assessment')
        .insert({
          analysis_id: analysisId,
          detected_stage: openAIAnalysis.stageAssessment.detectedStage,
          stage_confidence: openAIAnalysis.stageAssessment.stageConfidence,
          stage_appropriateness_score: openAIAnalysis.stageAssessment.stageAppropriatenessScore,
          stage_specific_feedback: openAIAnalysis.stageAssessment.stageFeedback,
        });

      if (stageError) {
        console.error('Failed to insert stage assessment:', stageError);
      }
    }

    if (openAIAnalysis.investmentReadiness) {
      const { error: readinessError } = await supabase
        .from('analysis_investment_readiness')
        .insert({
          analysis_id: analysisId,
          is_investment_ready: openAIAnalysis.investmentReadiness.isInvestmentReady,
          readiness_score: openAIAnalysis.investmentReadiness.readinessScore,
          readiness_summary: openAIAnalysis.investmentReadiness.readinessSummary,
          critical_blockers: openAIAnalysis.investmentReadiness.criticalBlockers,
          team_score: openAIAnalysis.investmentReadiness.teamScore,
          market_opportunity_score: openAIAnalysis.investmentReadiness.marketOpportunityScore,
          product_score: openAIAnalysis.investmentReadiness.productScore,
          traction_score: openAIAnalysis.investmentReadiness.tractionScore,
          financials_score: openAIAnalysis.investmentReadiness.financialsScore,
          team_feedback: openAIAnalysis.investmentReadiness.teamFeedback,
          market_opportunity_feedback: openAIAnalysis.investmentReadiness.marketOpportunityFeedback,
          product_feedback: openAIAnalysis.investmentReadiness.productFeedback,
          traction_feedback: openAIAnalysis.investmentReadiness.tractionFeedback,
          financials_feedback: openAIAnalysis.investmentReadiness.financialsFeedback,
        });

      if (readinessError) {
        console.error('Failed to insert investment readiness:', readinessError);
      }
    }

    if (openAIAnalysis.redFlags && openAIAnalysis.redFlags.length > 0) {
      const redFlagRecords = openAIAnalysis.redFlags.map(flag => ({
        analysis_id: analysisId,
        category: flag.category,
        severity: flag.severity,
        title: flag.title,
        description: flag.description,
        impact: flag.impact,
      }));

      const { error: redFlagsError } = await supabase
        .from('analysis_red_flags')
        .insert(redFlagRecords);

      if (redFlagsError) {
        console.error('Failed to insert red flags:', redFlagsError);
      }
    }

    if (openAIAnalysis.dealBreakers && openAIAnalysis.dealBreakers.length > 0) {
      const dealBreakerRecords = openAIAnalysis.dealBreakers.map(breaker => ({
        analysis_id: analysisId,
        title: breaker.title,
        description: breaker.description,
        recommendation: breaker.recommendation,
      }));

      const { error: dealBreakersError } = await supabase
        .from('analysis_deal_breakers')
        .insert(dealBreakerRecords);

      if (dealBreakersError) {
        console.error('Failed to insert deal breakers:', dealBreakersError);
      }
    }

    const result: AnalysisResult = {
      analysisId,
      overallScore: openAIAnalysis.overallScore,
      summary: openAIAnalysis.summary,
      totalPages: pageCount,
    };

    console.log('Analysis complete:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-deck function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
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