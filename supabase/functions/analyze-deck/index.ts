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

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<3-4 sentences of brutally honest assessment: Would you take this meeting? What's the biggest problem? Is this fundable? Be direct and unfiltered.>",
  "clarityScore": <number 0-100>,
  "designScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "structureScore": <number 0-100>,
  "overallScoreFeedback": "<4-5 sentences of harsh truth about why this deck scores what it does. Call out the specific problems. If it's weak, say why. If claims seem inflated, say so. No softening.>",
  "investmentGradeFeedback": "<4-5 sentences explaining the investment grade (most decks are D/C range, good ones are B+, exceptional ones are A-). What are the fatal flaws? What would make this actually investable? Be specific and direct.>",
  "fundingOddsFeedback": "<4-5 sentences with realistic funding odds. If traction is weak, say it. If the market is saturated, call it out. If the team lacks credibility, flag it. Include realistic percentage estimate of funding success.>",
  "pageCountFeedback": "<2-3 sentences on page count. If too long, say they're wasting VC time. If too short, call out missing critical info. Specify ideal range for their stage.>",
  "wordDensityAssessment": "<Low | Medium | High | Very High>",
  "wordDensityFeedback": "<3-4 sentences on text density. If slides are text-heavy, say VCs won't read walls of text. If unclear, call out the communication failure. Demand visual clarity.>",
  "strengths": ["<2-4 actual strengths - be specific, not generic. If deck is weak, list fewer strengths. Don't inflate.>"],
  "weaknesses": ["<6-12 specific, detailed weaknesses. Find the problems. Call out missing information. Identify unrealistic assumptions. Flag weak positioning. Be thorough and harsh.>"],
  "issues": [
    {
      "pageNumber": <page number or null if general>,
      "priority": "High" | "Medium" | "Low",
      "title": "<direct issue title>",
      "description": "<3-4 sentences explaining exactly what's wrong, why it matters to investors, and the real impact on fundability. Be specific with examples.>",
      "type": "issue" | "improvement"
    }
  ],
  "dealBreakers": [
    {
      "title": "<deal breaker that would cause immediate rejection>",
      "description": "<3-4 sentences on why this is a deal killer. What specifically makes this unfundable? Be blunt about the severity.>",
      "recommendation": "<2-3 sentences on exactly what needs to change. Be specific and actionable.>"
    }
  ],
  "redFlags": [
    {
      "category": "financial" | "team" | "market" | "product" | "competition" | "traction" | "other",
      "severity": "critical" | "major" | "moderate",
      "title": "<specific red flag that concerns VCs>",
      "description": "<2-3 sentences describing the exact problem. Call out inconsistencies, missing data, or questionable claims.>",
      "impact": "<2-3 sentences on how this affects funding chances. If it kills the deal, say so. Quantify impact.>"
    }
  ],
  "stageAssessment": {
    "detectedStage": "<Pre-seed | Seed | Series A | Series B | Growth>",
    "stageConfidence": "high" | "medium" | "low",
    "stageAppropriatenessScore": <0-100>,
    "stageFeedback": "<3-4 sentences on whether the deck matches the claimed stage. If they're pre-seed claiming Series A metrics, call it out. If stage-inappropriate, explain why.>"
  },
  "investmentReadiness": {
    "isInvestmentReady": <true | false>,
    "readinessScore": <0-100>,
    "readinessSummary": "<4-5 sentences of unfiltered truth about whether they're ready to raise. If not ready, say why specifically. If ready, what makes them stand out? Be direct.>",
    "criticalBlockers": ["<specific blocker with detail>", "<another blocker>", "<be thorough - identify ALL critical blockers>"],
    "teamScore": <0-100>,
    "marketOpportunityScore": <0-100>,
    "productScore": <0-100>,
    "tractionScore": <0-100>,
    "financialsScore": <0-100>,
    "teamFeedback": "<3-4 sentences: Can this team execute? Relevant experience? Domain expertise? Concerning gaps? First-time founders overpromising? Be critical of credibility.>",
    "marketOpportunityFeedback": "<3-4 sentences: Real opportunity or fantasy TAM math? Understand customer pain? Market timing right? Competition understood? Call out market delusions.>",
    "productFeedback": "<3-4 sentences: Real differentiation or me-too? Tech moat? Product-market fit evidence? Scalability? Call out if product seems weak or unproven.>",
    "tractionFeedback": "<3-4 sentences: Real traction or vanity metrics? Revenue or just users? Growth rate believable? Retention data? Flag if traction is insufficient or misleading.>",
    "financialsFeedback": "<3-4 sentences: Projections realistic or hockey stick fantasy? Unit economics make sense? CAC/LTV believable? Burn rate sustainable? Call out unrealistic assumptions.>"
  },
  "keyBusinessMetrics": {
    "companyName": "<company name or 'Not specified'>",
    "industry": "<industry or 'Not specified'>",
    "currentRevenue": "<revenue or 'Not specified'>",
    "fundingSought": "<funding amount or 'Not specified'>",
    "growthRate": "<growth rate or 'Not specified'>",
    "teamSize": <number or 0>,
    "marketSize": "<TAM/SAM/SOM or 'Not specified'>",
    "valuation": "<valuation or 'Not specified'>",
    "businessModel": "<business model or 'Not specified'>",
    "customerCount": "<customer count or 'Not specified'>"
  }
}

SCORING PHILOSOPHY (BE HARSH):
- Most decks are 20-50 range (weak to below average)
- Average decent decks are 35-45
- Good fundable decks are 55-70
- Excellent compelling decks are 70-80
- Only truly exceptional unicorn-potential decks score 80+
- Penalize heavily for: missing traction, weak teams, unrealistic projections, unclear value props, saturated markets
- Deduct points for: buzzword bingo, vague claims, missing critical slides, poor storytelling, amateur design

REQUIREMENTS (NON-NEGOTIABLE):
- Include 6-12 weaknesses minimum - dig deep and find problems
- Include 8-15 issues with specific page numbers and detailed explanations
- Include 4-10 red flags minimum - if you don't see at least 4 concerns, you're not looking hard enough
- Include 2-6 deal breakers for truly critical problems (if there are none, still identify potential ones)
- All feedback must be 3-5 sentences minimum - be thorough and specific
- Call out unrealistic claims, missing information, weak positioning, and amateur mistakes
- If something seems too good to be true, say so
- If the market is crowded, flag the competitive risk
- If the team seems inexperienced, question execution capability
- Every score must be justified with specific reasoning

This is about preparing founders for REAL VC scrutiny. Brutal honesty serves them better than false encouragement.`;

async function analyzeWithVision(
  imageUrls: string[],
  supabaseUrl: string,
  openaiKey: string,
  pageCount: number
): Promise<OpenAIAnalysis> {
  console.log(`Analyzing ${imageUrls.length} slide images with OpenAI Vision...`);

  const maxImages = Math.min(imageUrls.length, 10);
  const selectedImages = imageUrls.slice(0, maxImages);

  const imageContent = selectedImages.map((url) => {
    const fullUrl = url.startsWith('http') ? url : `${supabaseUrl}/storage/v1/object/public/${url}`;
    console.log(`Image URL: ${fullUrl}`);
    return {
      type: 'image_url' as const,
      image_url: {
        url: fullUrl,
        detail: 'high' as const
      }
    };
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: [
            {
              type: 'text',
              text: `Analyze this ${pageCount}-page pitch deck. I'm showing you ${selectedImages.length} slides. Please provide a comprehensive VC-style analysis.`
            },
            ...imageContent
          ]
        }
      ],
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Vision API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI Vision');
  }

  console.log('OpenAI Vision response length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to extract JSON. Full response:', content);
    throw new Error('No JSON found in Vision response. Check function logs for details.');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Matched JSON string:', jsonMatch[0]);
    throw new Error('Invalid JSON in Vision response. Check function logs for details.');
  }
}

async function analyzeWithText(
  text: string,
  openaiKey: string,
  pageCount: number
): Promise<OpenAIAnalysis> {
  console.log('Analyzing text content with OpenAI...');

  const maxChars = 25000;
  const textToAnalyze = text.substring(0, maxChars);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  console.log('OpenAI Text response length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to extract JSON. Full response:', content);
    throw new Error('No JSON found in response. Check function logs for details.');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Matched JSON string:', jsonMatch[0]);
    throw new Error('Invalid JSON in response. Check function logs for details.');
  }
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
    const sessionId = formData.get('sessionId') as string;
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

    const pageRecords = pages.map((page, i) => {
      let storagePath = imageUrls[i] || null;
      if (storagePath && storagePath.startsWith('http')) {
        const match = storagePath.match(/\/storage\/v1\/object\/public\/(.+)$/);
        if (match) {
          storagePath = match[1];
        }
      }
      return {
        analysis_id: analysisId,
        page_number: i + 1,
        title: `Slide ${i + 1}`,
        score: 50,
        content: page.text.substring(0, 1000),
        image_url: storagePath,
      };
    });

    const { error: pagesError } = await supabase
      .from('analysis_pages')
      .insert(pageRecords);

    if (pagesError) {
      console.error('Failed to insert pages:', pagesError);
    }

    const contentTextLength = text.replace(/--- PAGE \d+ ---/g, '').replace(/--- END PAGE \d+ ---/g, '').replace(/--- PDF METADATA ---[\s\S]*?--- END METADATA ---/g, '').trim().length;
    const isImageBasedPDF = contentTextLength < 500;

    console.log(`Content text length: ${contentTextLength} chars, isImageBased: ${isImageBasedPDF}`);

    let analysis: OpenAIAnalysis;

    if (isImageBasedPDF && imageUrls.length > 0) {
      console.log('Using OpenAI Vision for image-based PDF analysis...');
      analysis = await analyzeWithVision(imageUrls, supabaseUrl, openaiKey, pageCount);
    } else if (text.length > 100) {
      console.log('Using text-based analysis...');
      analysis = await analyzeWithText(text, openaiKey, pageCount);
    } else if (imageUrls.length > 0) {
      console.log('Minimal text, falling back to Vision analysis...');
      analysis = await analyzeWithVision(imageUrls, supabaseUrl, openaiKey, pageCount);
    } else {
      throw new Error('Unable to analyze: No text content and no slide images available');
    }

    console.log('Analysis complete, overall score:', analysis.overallScore);

    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        overall_score: Math.min(100, Math.max(0, analysis.overallScore)),
        summary: analysis.summary,
        investment_ready: analysis.investmentReadiness?.isInvestmentReady || false,
        funding_stage: analysis.stageAssessment?.detectedStage || null,
        word_density: analysis.wordDensityAssessment || 'Medium',
        overall_score_feedback: analysis.overallScoreFeedback || null,
        investment_grade_feedback: analysis.investmentGradeFeedback || null,
        funding_odds_feedback: analysis.fundingOddsFeedback || null,
        page_count_feedback: analysis.pageCountFeedback || null,
        word_density_feedback: analysis.wordDensityFeedback || null,
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

    if (analysis.keyBusinessMetrics) {
      const kbm = analysis.keyBusinessMetrics;
      const keyMetricsRecord = {
        analysis_id: analysisId,
        company_name: kbm.companyName || 'Not specified',
        industry: kbm.industry || 'Not specified',
        current_revenue: kbm.currentRevenue || 'Not specified',
        funding_sought: kbm.fundingSought || 'Not specified',
        growth_rate: kbm.growthRate || 'Not specified',
        team_size: kbm.teamSize || 0,
        market_size: kbm.marketSize || 'Not specified',
        valuation: kbm.valuation || 'Not specified',
        business_model: kbm.businessModel || 'Not specified',
        customer_count: kbm.customerCount || 'Not specified',
      };

      const { error: keyMetricsError } = await supabase
        .from('key_business_metrics')
        .insert(keyMetricsRecord);

      if (keyMetricsError) {
        console.error('Failed to insert key business metrics:', keyMetricsError);
      }
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