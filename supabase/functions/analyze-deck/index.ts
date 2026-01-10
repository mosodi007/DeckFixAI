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
}

const ANALYSIS_PROMPT = `You are an expert venture capital pitch deck analyst. Analyze this pitch deck text and provide comprehensive feedback.

Evaluate using these VC-standard criteria:
- Problem/Solution clarity and market opportunity
- Business model viability and revenue potential
- Team credibility and execution capability
- Traction, metrics, and proof points
- Financial projections and use of funds
- Competitive landscape awareness
- Overall storytelling and narrative flow

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence executive summary of the deck's investment readiness>",
  "clarityScore": <number 0-100>,
  "designScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "structureScore": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness/issue 1>", "<weakness/issue 2>", "<weakness/issue 3>"],
  "issues": [
    {
      "pageNumber": <page number or null if general>,
      "priority": "High" | "Medium" | "Low",
      "title": "<short issue title>",
      "description": "<detailed description>",
      "type": "issue" | "improvement"
    }
  ],
  "dealBreakers": [
    {
      "title": "<deal breaker title>",
      "description": "<why this is critical>",
      "recommendation": "<how to fix>"
    }
  ],
  "redFlags": [
    {
      "category": "financial" | "team" | "market" | "product" | "competition" | "traction" | "other",
      "severity": "critical" | "major" | "moderate",
      "title": "<red flag title>",
      "description": "<description>",
      "impact": "<impact on funding potential>"
    }
  ],
  "stageAssessment": {
    "detectedStage": "<Pre-seed | Seed | Series A | Series B | Growth>",
    "stageConfidence": "high" | "medium" | "low",
    "stageAppropriatenessScore": <0-100>,
    "stageFeedback": "<feedback on stage appropriateness>"
  },
  "investmentReadiness": {
    "isInvestmentReady": <true | false>,
    "readinessScore": <0-100>,
    "readinessSummary": "<summary of investment readiness>",
    "criticalBlockers": ["<blocker 1>", "<blocker 2>"],
    "teamScore": <0-100>,
    "marketOpportunityScore": <0-100>,
    "productScore": <0-100>,
    "tractionScore": <0-100>,
    "financialsScore": <0-100>,
    "teamFeedback": "<team assessment feedback>",
    "marketOpportunityFeedback": "<market opportunity feedback>",
    "productFeedback": "<product feedback>",
    "tractionFeedback": "<traction feedback>",
    "financialsFeedback": "<financials feedback>"
  }
}

Important guidelines:
- Be critical but constructive - VCs are discerning
- Score realistically (most decks are 40-70, excellent ones 75-85)
- Identify 3-5 strengths and 3-5 weaknesses
- Include 5-10 issues with specific page references when possible
- Only include deal breakers for truly critical problems (empty array if none)
- Include 2-5 red flags that would concern investors
- Assess the funding stage based on content maturity`;

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
    const clientAnalysisId = formData.get('analysisId') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes');

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
      console.log(`PDF extraction successful: ${text.length} characters from ${pageCount} pages`);
    } catch (pdfError: any) {
      console.error('PDF extraction failed:', pdfError);
      throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
    }

    const analysisId = clientAnalysisId || crypto.randomUUID();
    console.log('Analysis ID:', analysisId);

    const analysisRecord = {
      id: analysisId,
      user_id: user?.id || null,
      session_id: !user?.id ? sessionId : null,
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
      console.error('Failed to insert analysis:', analysisError);
      throw new Error(`Failed to save analysis: ${analysisError.message}`);
    }

    console.log('Initial analysis record created');

    const pageRecords = pages.map((page, i) => ({
      analysis_id: analysisId,
      page_number: i + 1,
      title: `Slide ${i + 1}`,
      score: 50,
      content: page.text.substring(0, 1000),
      image_url: null,
    }));

    const { error: pagesError } = await supabase
      .from('analysis_pages')
      .insert(pageRecords);

    if (pagesError) {
      console.error('Failed to insert pages:', pagesError);
    }

    console.log('Calling OpenAI for analysis...');
    const maxChars = 25000;
    const textToAnalyze = text.substring(0, maxChars);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          {
            role: 'user',
            content: `Analyze this ${pageCount}-page pitch deck:\n\n${textToAnalyze}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received, parsing...');

    let analysis: OpenAIAnalysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse analysis response');
    }

    console.log('Analysis parsed, overall score:', analysis.overallScore);

    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        overall_score: Math.min(100, Math.max(0, analysis.overallScore)),
        summary: analysis.summary,
        investment_ready: analysis.investmentReadiness?.isInvestmentReady || false,
        funding_stage: analysis.stageAssessment?.detectedStage || null,
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Failed to update analysis:', updateError);
    }

    const metricsRecord = {
      analysis_id: analysisId,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      clarity_score: Math.min(100, Math.max(0, analysis.clarityScore || 50)),
      design_score: Math.min(100, Math.max(0, analysis.designScore || 50)),
      content_score: Math.min(100, Math.max(0, analysis.contentScore || 50)),
      structure_score: Math.min(100, Math.max(0, analysis.structureScore || 50)),
    };

    const { error: metricsError } = await supabase
      .from('analysis_metrics')
      .insert(metricsRecord);

    if (metricsError) {
      console.error('Failed to insert metrics:', metricsError);
    }

    if (analysis.issues?.length > 0) {
      const issueRecords = analysis.issues.map(issue => ({
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

    if (analysis.dealBreakers?.length > 0) {
      const dealBreakerRecords = analysis.dealBreakers.map(db => ({
        analysis_id: analysisId,
        title: db.title,
        description: db.description,
        recommendation: db.recommendation,
      }));

      const { error: dealBreakersError } = await supabase
        .from('analysis_deal_breakers')
        .insert(dealBreakerRecords);

      if (dealBreakersError) {
        console.error('Failed to insert deal breakers:', dealBreakersError);
      }
    }

    if (analysis.redFlags?.length > 0) {
      const redFlagRecords = analysis.redFlags.map(rf => ({
        analysis_id: analysisId,
        category: rf.category,
        severity: rf.severity,
        title: rf.title,
        description: rf.description,
        impact: rf.impact,
      }));

      const { error: redFlagsError } = await supabase
        .from('analysis_red_flags')
        .insert(redFlagRecords);

      if (redFlagsError) {
        console.error('Failed to insert red flags:', redFlagsError);
      }
    }

    if (analysis.stageAssessment) {
      const stageRecord = {
        analysis_id: analysisId,
        detected_stage: analysis.stageAssessment.detectedStage,
        stage_confidence: analysis.stageAssessment.stageConfidence,
        stage_appropriateness_score: Math.min(100, Math.max(0, analysis.stageAssessment.stageAppropriatenessScore)),
        stage_specific_feedback: analysis.stageAssessment.stageFeedback,
      };

      const { error: stageError } = await supabase
        .from('analysis_stage_assessment')
        .insert(stageRecord);

      if (stageError) {
        console.error('Failed to insert stage assessment:', stageError);
      }
    }

    if (analysis.investmentReadiness) {
      const ir = analysis.investmentReadiness;
      const readinessRecord = {
        analysis_id: analysisId,
        is_investment_ready: ir.isInvestmentReady,
        readiness_score: Math.min(100, Math.max(0, ir.readinessScore)),
        readiness_summary: ir.readinessSummary,
        critical_blockers: ir.criticalBlockers || [],
        team_score: Math.min(100, Math.max(0, ir.teamScore)),
        market_opportunity_score: Math.min(100, Math.max(0, ir.marketOpportunityScore)),
        product_score: Math.min(100, Math.max(0, ir.productScore)),
        traction_score: Math.min(100, Math.max(0, ir.tractionScore)),
        financials_score: Math.min(100, Math.max(0, ir.financialsScore)),
        team_feedback: ir.teamFeedback,
        market_opportunity_feedback: ir.marketOpportunityFeedback,
        product_feedback: ir.productFeedback,
        traction_feedback: ir.tractionFeedback,
        financials_feedback: ir.financialsFeedback,
      };

      const { error: readinessError } = await supabase
        .from('analysis_investment_readiness')
        .insert(readinessRecord);

      if (readinessError) {
        console.error('Failed to insert investment readiness:', readinessError);
      }
    }

    console.log('All analysis data saved successfully');

    const result: AnalysisResult = {
      analysisId,
      overallScore: analysis.overallScore,
      summary: analysis.summary,
      totalPages: pageCount,
    };

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