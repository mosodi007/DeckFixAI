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
        wordCount: page.text.trim().split(/\\s+/).filter(w => w.length > 0).length
      }));

      console.log(`✓ PDF extraction successful: ${text.length} characters from ${pageCount} pages`);
      console.log('PDF metadata:', pdfMetadata ? JSON.stringify(pdfMetadata.info) : 'None');
      console.log('Word counts per page:', perPageWordCounts.map(p => `Page ${p.pageNumber}: ${p.wordCount} words`).join(', '));
    } catch (pdfError) {
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

    const prompt = `You are an experienced VC analyzing this ${pageCount}-page pitch deck. Be brutally honest and direct. No sugar-coating. Call out weaknesses plainly.

${isImageBased ? `⚠️ NOTE: This deck appears to be IMAGE-BASED (slides are images/graphics, not text). Most pages have minimal extractable text.

**IMPORTANT FOR IMAGE-BASED DECKS:**
- Try to extract the company name from PDF metadata (Title, Author fields) or any available text
- If metadata has "XYZ Pitch Deck" or "XYZ Company", extract "XYZ" as the company name
- Look for company names in Author, Creator, or Title fields
- Even with minimal text, try to identify: company name, funding stage indicators, key metrics if mentioned
- For fields you cannot determine, mark as "Not specified - requires visual analysis"
- DO NOT mark company name as "Not specified" if it appears ANYWHERE in metadata or extractable text` : ''}

## WORD COUNT PER PAGE:
${wordCountSummary}

## DECK CONTENT:
${textToAnalyze}

## INSTRUCTIONS:
Provide analysis in strict JSON format. Be concise and specific.${isImageBased ? ' Since this is an image-based deck, extract whatever information is available (especially company name from metadata), and note that visual elements cannot be assessed at this stage. Mark unavailable fields as "Not specified - requires visual analysis".' : ''}

### STEP 1: DETECT FUNDING STAGE

Based on the content, determine the funding stage:
- **Pre-Seed**: Idea stage, no/minimal revenue, early prototype
- **Seed**: MVP built, early traction, <$100K ARR, need product-market fit
- **Series A**: Proven product-market fit, $1M+ ARR, scaling playbook needed
- **Series B+**: Significant revenue ($10M+ ARR), proven unit economics, market expansion

Provide: detected_stage, stage_confidence (high/medium/low), stage_appropriateness_score (0-100)

### STEP 2: INVESTMENT READINESS

Score 5 dimensions (0-100 each) and provide COMPREHENSIVE detailed feedback for EACH. Each feedback should be 6-8 sentences covering multiple angles with brutal honesty:

- **Team**: Founder quality, experience, completeness
  - Provide teamFeedback: 6-8 sentences covering:
    1. Founder backgrounds (names, previous roles, relevant experience, years in industry)
    2. Team completeness (is there a full C-suite? missing key roles?)
    3. Domain expertise (do they deeply understand this market/problem?)
    4. Execution track record (have they built/scaled companies before?)
    5. Red flags (first-time founders? solo founder? team conflicts mentioned?)
    6. Overall assessment of whether this team can execute at scale
  - Be brutally honest. If team is incomplete or inexperienced, state it plainly with specifics.

- **Market**: TAM size, growth, accessibility
  - Provide marketOpportunityFeedback: 6-8 sentences covering:
    1. Market size (TAM, SAM, SOM with specific numbers if provided)
    2. Market growth rate and trajectory (is it growing? declining? stagnant?)
    3. Competitive landscape (who are the major players? how crowded is it?)
    4. Market accessibility (can a startup realistically capture share here?)
    5. Timing (why now? is this too early or too late?)
    6. Market validation (is the problem real and urgent?)
  - If market size is missing or unclear, call it out explicitly.

- **Product**: Solution clarity, innovation, differentiation
  - Provide productSolutionFeedback: 6-8 sentences covering:
    1. Problem-solution fit (is the solution clearly addressing the stated problem?)
    2. Product description clarity (can you visualize what they're building?)
    3. Innovation level (is this truly novel or just incremental?)
    4. Differentiation (what makes this better/different from alternatives?)
    5. Technical feasibility (is this buildable? any major technical risks?)
    6. Product-market fit evidence (are customers actually using/wanting this?)
  - If product details are vague or missing, say so directly.

- **Traction**: Revenue, users, growth, metrics
  - Provide tractionFeedback: 6-8 sentences covering:
    1. Current metrics (users, revenue, engagement - specific numbers)
    2. Growth trajectory (MoM/YoY growth rates, trends)
    3. Customer validation (do people pay? what's retention?)
    4. Milestone achievement (have they hit stated goals?)
    5. Red flags (declining growth? poor unit economics? high churn?)
    6. Stage-appropriate expectations (is this traction right for their stage?)
  - If traction is weak or missing, state it clearly without softening.

- **Business Model**: Monetization, unit economics, scalability
  - Provide businessModelFeedback: 6-8 sentences covering:
    1. Revenue model clarity (how do they make money?)
    2. Pricing strategy (is it clear? defensible? tested?)
    3. Unit economics (CAC, LTV, margins, payback period)
    4. Scalability (can this model scale efficiently?)
    5. Defensibility (is this business model replicable or protected?)
    6. Financial projections reasonableness
  - If financials are missing or unrealistic, be explicit and harsh.

### OVERALL SCORE:
Provide an overall investment readiness score (0-100) based on:
- How compelling this is as an investment opportunity
- Whether the deck would get a VC meeting
- Stage-appropriateness of the content

### KEY STRENGTHS:
List 3-8 major strengths of the deck. Each strength should be a detailed, specific statement (10-20 words) that includes:
- WHAT the strength is
- WHY it matters to investors
- Specific metrics, names, or details when available
- Example: Instead of "Strong team" write "Experienced founding team with 15+ years at Google and Tesla, proven track record in autonomous systems"
- Example: Instead of "Good traction" write "Strong early traction with 5K paying users and $200K MRR after 8 months, 25% MoM growth"
- Example: Instead of "Large market" write "Targeting $85B financial services market with clear wedge in underbanked Nigerian SME segment (15M businesses)"

### KEY ISSUES TO ADDRESS:
List 3-8 critical issues that must be fixed. Each issue should be a detailed, specific statement (10-20 words) that includes:
- WHAT the problem is
- WHY it's concerning to investors
- Specific examples or page references when relevant
- Example: Instead of "Weak financials" write "Financials page lacks critical unit economics - CAC, LTV, and payback period missing, making ROI unclear"
- Example: Instead of "Poor design" write "Slides 4-7 are text-heavy with 200+ words per slide, making key points hard to grasp quickly"
- Example: Instead of "Missing information" write "No clear go-to-market strategy - customer acquisition channels, costs, and timeline completely absent"

### DETAILED DIAGNOSTIC ISSUES:
List specific problems found for improvement tracking:
- pageNumber: which page has the issue (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: brief issue name
- description: what's wrong and why it matters (2-3 sentences, specific)
- category: "content", "design", "structure", "data", or "messaging"

Be thorough and find 8-15 specific issues across content quality, design problems, missing information, unclear messaging, and structural problems.

### EXTRACT KEY BUSINESS METRICS:
Extract the following business metrics from the deck content. If a metric is not explicitly stated, write "Not specified":
- companyName: Company name (string). **IMPORTANT: Check PDF metadata fields (Title, Author, Subject, Creator) FIRST. If metadata contains "XYZ Pitch Deck" or "XYZ Company" or "XYZ - Series A", extract "XYZ" as the company name. Also look in the first page content. Only mark as "Not specified" if truly no company identifier exists anywhere.**
- industry: Industry/sector (string)
- currentRevenue: Current revenue/ARR (string with units, e.g., "$2M ARR", "Not specified")
- fundingSought: Amount of funding sought (string with units, e.g., "$5M Series A", "Not specified")
- teamSize: Current team size (string, e.g., "12 employees", "Not specified")
- customerCount: Number of customers/users (string, e.g., "5,000 users", "Not specified")
- growthRate: Growth rate if mentioned (string, e.g., "30% MoM", "Not specified")
- monthlyRevenue: Monthly recurring revenue if mentioned (string, e.g., "$50K MRR", "Not specified")

### VC EVALUATION CRITERIA (NEW):
Score the deck on 8 standard VC criteria (0-100 each) with detailed 4-6 sentence feedback explaining the score:

1. **Team Quality & Completeness** (teamQualityScore, teamQualityFeedback)
   - Founder experience, relevant domain expertise, team gaps, execution capability

2. **Market Size & Growth** (marketSizeScore, marketSizeFeedback)
   - TAM clarity, market growth rate, timing, accessibility

3. **Product Differentiation** (productDifferentiationScore, productDifferentiationFeedback)
   - Uniqueness, competitive moat, technical innovation, defensibility

4. **Business Model Viability** (businessModelScore, businessModelFeedback)
   - Revenue model clarity, unit economics, scalability, margins

5. **Go-to-Market Strategy** (gtmStrategyScore, gtmStrategyFeedback)
   - Customer acquisition plan, distribution channels, CAC, scaling strategy

6. **Competitive Positioning** (competitivePositionScore, competitivePositionFeedback)
   - Competitive landscape understanding, differentiation, sustainable advantages

7. **Financial Projections** (financialProjectionsScore, financialProjectionsFeedback)
   - Realism, detail level, assumptions clarity, path to profitability

8. **Use of Funds** (useOfFundsScore, useOfFundsFeedback)
   - Clarity of ask, allocation rationale, milestone mapping, capital efficiency

### MISSING CRITICAL PAGES:
Identify which standard pitch deck pages/sections are completely missing:
- List missing sections from: Cover, Problem, Solution, Product, Market Size, Business Model, Traction, Competition, Go-to-Market, Team, Financials, Use of Funds, Vision/Roadmap, Appendix
- For each missing section, explain why it's important (1 sentence)
- Only list truly MISSING sections, not weak ones

### RED FLAGS:
List 0-5 serious red flags that would make VCs hesitant:
- Each red flag should be specific and explain the concern
- Examples: "No technical co-founder despite being a deep-tech company", "Unrealistic 10x revenue projection without justification", "Founders have no equity split mentioned, suggests potential conflict"
- Leave empty if no major red flags

### DEAL BREAKERS:
List 0-3 absolute deal breakers that would result in immediate rejection:
- These should be fundamental flaws, not fixable issues
- Examples: "No identifiable market need or validation", "Product is illegal in target market", "Founders own <5% equity, no upside"
- Leave empty if no deal breakers

Return ONLY valid JSON matching this exact structure:

{
  "stage": {
    "detected_stage": "<Pre-Seed|Seed|Series A|Series B+>",
    "stage_confidence": "<high|medium|low>",
    "stage_appropriateness_score": <0-100>
  },
  "investmentReadiness": {
    "teamScore": <0-100>,
    "teamFeedback": "<6-8 sentences with brutal honesty>",
    "marketScore": <0-100>,
    "marketOpportunityFeedback": "<6-8 sentences>",
    "productScore": <0-100>,
    "productSolutionFeedback": "<6-8 sentences>",
    "tractionScore": <0-100>,
    "tractionFeedback": "<6-8 sentences>",
    "businessModelScore": <0-100>,
    "businessModelFeedback": "<6-8 sentences>"
  },
  "overallScore": <0-100>,
  "strengths": [
    "<detailed 10-20 word strength with specifics>",
    ...
  ],
  "keyIssues": [
    "<detailed 10-20 word issue with specifics>",
    ...
  ],
  "detailedIssues": [
    {
      "pageNumber": <number or null>,
      "priority": "<high|medium|low>",
      "title": "<brief title>",
      "description": "<2-3 specific sentences>",
      "category": "<content|design|structure|data|messaging>"
    },
    ...
  ],
  "keyMetrics": {
    "companyName": "<string>",
    "industry": "<string>",
    "currentRevenue": "<string>",
    "fundingSought": "<string>",
    "teamSize": "<string>",
    "customerCount": "<string>",
    "growthRate": "<string>",
    "monthlyRevenue": "<string>"
  },
  "vcCriteria": {
    "teamQualityScore": <0-100>,
    "teamQualityFeedback": "<4-6 sentences>",
    "marketSizeScore": <0-100>,
    "marketSizeFeedback": "<4-6 sentences>",
    "productDifferentiationScore": <0-100>,
    "productDifferentiationFeedback": "<4-6 sentences>",
    "businessModelScore": <0-100>,
    "businessModelFeedback": "<4-6 sentences>",
    "gtmStrategyScore": <0-100>,
    "gtmStrategyFeedback": "<4-6 sentences>",
    "competitivePositionScore": <0-100>,
    "competitivePositionFeedback": "<4-6 sentences>",
    "financialProjectionsScore": <0-100>,
    "financialProjectionsFeedback": "<4-6 sentences>",
    "useOfFundsScore": <0-100>,
    "useOfFundsFeedback": "<4-6 sentences>"
  },
  "missingPages": [
    { "section": "<name>", "importance": "<why it matters>" },
    ...
  ],
  "redFlags": [
    "<specific red flag with explanation>",
    ...
  ],
  "dealBreakers": [
    "<fundamental flaw>",
    ...
  ],
  "summary": "<2-3 sentence executive summary of the deck's viability>",
  "idealInvestor": "<1 sentence: who should invest and why>",
  "idealVersion": "<1 short sentence max 10 words: what this deck would be if perfect>",
  "deckQuality": {
    "clarityScore": <0-100>,
    "designScore": <0-100>,
    "completenessScore": <0-100>,
    "storytellingScore": <0-100>,
    "dataQualityScore": <0-100>,
    "structureScore": <0-100>
  }
}`;

    console.log('Sending request to OpenAI...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a brutally honest VC analyst. Provide direct, specific feedback. No sugar-coating. Return only valid JSON.'
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

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API request failed: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');
    console.log('Response tokens:', openAIData.usage);

    const analysisText = openAIData.choices[0]?.message?.content;

    if (!analysisText) {
      console.error('No content in OpenAI response:', JSON.stringify(openAIData));
      throw new Error('No analysis content received from OpenAI');
    }

    console.log('Parsing analysis JSON...');
    const analysis = JSON.parse(analysisText);
    console.log('Analysis parsed successfully');

    const analysisId = crypto.randomUUID();
    console.log('Creating analysis record with ID:', analysisId);

    const analysisRecord = {
      id: analysisId,
      user_id: user?.id || null,
      session_id: !user?.id ? sessionId : null,
      file_name: file.name,
      file_size: file.size,
      overall_score: analysis.overallScore || 0,
      summary: analysis.summary || 'No summary provided',
      total_pages: pageCount,
      created_at: new Date().toISOString(),
    };

    console.log('Inserting analysis:', analysisRecord);
    const { error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisRecord);

    if (analysisError) {
      console.error('Failed to insert analysis:', analysisError);
      throw new Error(`Failed to save analysis: ${analysisError.message}`);
    }

    console.log('✓ Analysis inserted successfully');

    if (analysis.stage) {
      console.log('Inserting stage assessment...');
      await supabase.from('analysis_stage_assessment').insert({
        analysis_id: analysisId,
        detected_stage: analysis.stage.detected_stage || 'Unknown',
        stage_confidence: analysis.stage.stage_confidence || 'low',
        stage_appropriateness_score: analysis.stage.stage_appropriateness_score || 0,
        stage_specific_feedback: '',
      });
    }

    if (analysis.investmentReadiness) {
      console.log('Inserting investment readiness...');
      const ir = analysis.investmentReadiness;
      await supabase.from('analysis_investment_readiness').insert({
        analysis_id: analysisId,
        is_investment_ready: false,
        readiness_score: analysis.overallScore || 0,
        readiness_summary: analysis.summary || '',
        critical_blockers: [],
        team_score: ir.teamScore || 0,
        team_feedback: ir.teamFeedback || '',
        market_opportunity_score: ir.marketScore || 0,
        market_opportunity_feedback: ir.marketOpportunityFeedback || '',
        product_score: ir.productScore || 0,
        product_feedback: ir.productSolutionFeedback || '',
        traction_score: ir.tractionScore || 0,
        traction_feedback: ir.tractionFeedback || '',
        financials_score: ir.businessModelScore || 0,
        financials_feedback: ir.businessModelFeedback || '',
      });
    }

    if (analysis.deckQuality) {
      console.log('Inserting deck quality metrics...');
      await supabase.from('deck_quality_metrics').insert({
        analysis_id: analysisId,
        clarity_score: analysis.deckQuality.clarityScore || 0,
        design_score: analysis.deckQuality.designScore || 0,
        completeness_score: analysis.deckQuality.completenessScore || 0,
        storytelling_score: analysis.deckQuality.storytellingScore || 0,
        data_quality_score: analysis.deckQuality.dataQualityScore || 0,
        structure_score: analysis.deckQuality.structureScore || 0,
      });
    }

    if (analysis.keyMetrics) {
      console.log('Inserting key business metrics:', analysis.keyMetrics);

      let teamSize = 0;
      if (analysis.keyMetrics.teamSize && typeof analysis.keyMetrics.teamSize === 'string') {
        const match = analysis.keyMetrics.teamSize.match(/\d+/);
        if (match) {
          teamSize = parseInt(match[0], 10);
        }
      } else if (typeof analysis.keyMetrics.teamSize === 'number') {
        teamSize = analysis.keyMetrics.teamSize;
      }

      await supabase.from('key_business_metrics').insert({
        analysis_id: analysisId,
        company_name: analysis.keyMetrics.companyName || 'Not specified',
        industry: analysis.keyMetrics.industry || 'Not specified',
        current_revenue: analysis.keyMetrics.currentRevenue || 'Not specified',
        funding_sought: analysis.keyMetrics.fundingSought || 'Not specified',
        team_size: teamSize,
        customer_count: analysis.keyMetrics.customerCount || 'Not specified',
        growth_rate: analysis.keyMetrics.growthRate || 'Not specified',
        market_size: 'Not specified',
        valuation: 'Not specified',
        business_model: 'Not specified',
      });
    }

    if (analysis.vcCriteria) {
      console.log('Inserting VC criteria scores...');
      const vc = analysis.vcCriteria;
      await supabase.from('vc_criteria_scores').insert({
        analysis_id: analysisId,
        team_quality_score: vc.teamQualityScore || 0,
        team_quality_feedback: vc.teamQualityFeedback || '',
        market_size_score: vc.marketSizeScore || 0,
        market_size_feedback: vc.marketSizeFeedback || '',
        product_differentiation_score: vc.productDifferentiationScore || 0,
        product_differentiation_feedback: vc.productDifferentiationFeedback || '',
        business_model_score: vc.businessModelScore || 0,
        business_model_feedback: vc.businessModelFeedback || '',
        gtm_strategy_score: vc.gtmStrategyScore || 0,
        gtm_strategy_feedback: vc.gtmStrategyFeedback || '',
        competitive_position_score: vc.competitivePositionScore || 0,
        competitive_position_feedback: vc.competitivePositionFeedback || '',
        financial_projections_score: vc.financialProjectionsScore || 0,
        financial_projections_feedback: vc.financialProjectionsFeedback || '',
        use_of_funds_score: vc.useOfFundsScore || 0,
        use_of_funds_feedback: vc.useOfFundsFeedback || '',
      });
    }

    if (analysis.strengths && analysis.strengths.length > 0) {
      console.log(`Inserting ${analysis.strengths.length} strengths...`);
      const strengthRecords = analysis.strengths.map((strength: string) => ({
        analysis_id: analysisId,
        description: strength,
      }));
      await supabase.from('strengths').insert(strengthRecords);
    }

    if (analysis.keyIssues && analysis.keyIssues.length > 0) {
      console.log(`Inserting ${analysis.keyIssues.length} key issues...`);
      const issueRecords = analysis.keyIssues.map((issue: string) => ({
        analysis_id: analysisId,
        description: issue,
      }));
      await supabase.from('key_issues').insert(issueRecords);
    }

    if (analysis.detailedIssues && analysis.detailedIssues.length > 0) {
      console.log(`Inserting ${analysis.detailedIssues.length} detailed issues...`);
      const detailedIssueRecords = analysis.detailedIssues.map((issue: any) => ({
        analysis_id: analysisId,
        page_number: issue.pageNumber,
        priority: issue.priority || 'medium',
        title: issue.title || 'Untitled Issue',
        description: issue.description || '',
        category: issue.category || 'content',
      }));
      await supabase.from('detailed_issues').insert(detailedIssueRecords);
    }

    if (analysis.missingPages && analysis.missingPages.length > 0) {
      console.log(`Inserting ${analysis.missingPages.length} missing pages...`);
      const missingPageRecords = analysis.missingPages.map((page: any) => ({
        analysis_id: analysisId,
        section: page.section || 'Unknown',
        importance: page.importance || '',
      }));
      await supabase.from('missing_pages').insert(missingPageRecords);
    }

    if (analysis.redFlags && analysis.redFlags.length > 0) {
      console.log(`Inserting ${analysis.redFlags.length} red flags...`);
      const redFlagRecords = analysis.redFlags.map((flag: string, index: number) => ({
        analysis_id: analysisId,
        category: 'other',
        severity: 'major',
        title: `Red Flag ${index + 1}`,
        description: flag,
        impact: 'May significantly reduce funding chances',
      }));
      await supabase.from('analysis_red_flags').insert(redFlagRecords);
    }

    if (analysis.dealBreakers && analysis.dealBreakers.length > 0) {
      console.log(`Inserting ${analysis.dealBreakers.length} deal breakers...`);
      const dealBreakerRecords = analysis.dealBreakers.map((breaker: string, index: number) => ({
        analysis_id: analysisId,
        title: `Deal Breaker ${index + 1}`,
        description: breaker,
        recommendation: 'Address this fundamental issue before seeking funding',
      }));
      await supabase.from('analysis_deal_breakers').insert(dealBreakerRecords);
    }

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
      console.log(`✓ Created ${pageCount} page records`);
    }

    const result: AnalysisResult = {
      analysisId,
      overallScore: analysis.overallScore || 0,
      summary: analysis.summary || 'No summary provided',
      totalPages: pageCount,
    };

    console.log('Analysis complete:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
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