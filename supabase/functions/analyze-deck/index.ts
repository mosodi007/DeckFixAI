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
      console.log('Anonymous user - will use session_id');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const providedAnalysisId = formData.get('analysisId') as string;
    const sessionId = formData.get('sessionId') as string;

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
    let perPageWordCounts: { pageNumber: number; wordCount: number }[];

    try {
      const result = await extractTextFromPDF(arrayBuffer);
      text = result.text;
      pageCount = result.pageCount;

      // Calculate word count per page
      perPageWordCounts = result.pages.map(page => ({
        pageNumber: page.pageNumber,
        wordCount: page.text.trim().split(/\s+/).filter(w => w.length > 0).length
      }));

      console.log(`✓ PDF extraction successful: ${text.length} characters from ${pageCount} pages`);
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
    const isImageBased = text.includes('image-based and requires visual analysis');

    const prompt = `You are an experienced VC analyzing this ${pageCount}-page pitch deck. Be brutally honest and direct. No sugar-coating. Call out weaknesses plainly.

${isImageBased ? '⚠️ NOTE: This deck appears to be IMAGE-BASED (slides are images/graphics, not text). Most pages have minimal extractable text. Analyze what text is available, but note that full visual analysis will be performed separately.' : ''}

## WORD COUNT PER PAGE:
${wordCountSummary}

## DECK CONTENT:
${textToAnalyze}

## INSTRUCTIONS:
Provide analysis in strict JSON format. Be concise and specific.${isImageBased ? ' Since this is an image-based deck, base your analysis on the limited text available and note that visual elements cannot be assessed at this stage.' : ''}

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
  - Be blunt about market reality. If it's oversaturated or too small, say so with data.

- **Product**: Solution strength, differentiation, moat
  - Provide productFeedback: 6-8 sentences covering:
    1. Solution clarity (is it clear what the product does and how?)
    2. Differentiation (what makes this unique vs. competitors?)
    3. Technical moat (patents, proprietary tech, network effects, data advantages?)
    4. Competitive advantages (why can't incumbents replicate this easily?)
    5. Product-market fit evidence (do customers actually want this?)
    6. Defensibility long-term (can they maintain advantage as market evolves?)
  - Be direct. If it's just another SaaS tool with no moat, call it out explicitly.

- **Traction**: Revenue, users, partnerships, metrics
  - Provide tractionFeedback: 6-8 sentences covering:
    1. Current metrics (revenue, ARR, MRR, users, customers with specific numbers)
    2. Growth trajectory (MoM, YoY growth rates, acceleration or deceleration?)
    3. Customer acquisition (how are they getting customers? CAC metrics?)
    4. Customer retention (churn rate, NRR, customer satisfaction signals)
    5. Key partnerships or validation signals (enterprise customers, pilots, LOIs)
    6. Quality of traction (is it real revenue or just vanity metrics?)
  - Be honest about traction quality. Weak or fake traction must be called out.

- **Financials**: Projections quality, burn rate, use of funds
  - Provide financialsFeedback: 6-8 sentences covering:
    1. Financial projections quality (realistic? based on data? hockey stick?)
    2. Unit economics (CAC, LTV, LTV:CAC ratio, gross margins, contribution margin)
    3. Current burn rate and runway (months of cash left)
    4. Path to profitability (when and how will they be cash-flow positive?)
    5. Use of funds clarity (is ask amount justified? clear deployment plan?)
    6. Capital efficiency (are they using money wisely? can they do more with less?)
  - Be harsh on unrealistic projections or missing critical financial data.

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
CRITICAL: You MUST include an entry for EVERY SINGLE PAGE in the deck. The deck has ${pageCount} pages, so your pages array MUST contain exactly ${pageCount} entries numbered 1 through ${pageCount}. Do not skip any pages. Keep ALL feedback EXTREMELY brief to fit within token limits.

For EACH page (1 to ${pageCount}):
- pageNumber: actual page number (1, 2, 3, ... ${pageCount})
- title: Slide title/heading (e.g., "Cover", "Problem", "Solution")
- score: 0-100 (be harsh, most slides score 40-70)
- content: 1 SHORT sentence (max 10 words)
- feedback: 1 SHORT sentence only (max 15 words)
- recommendations: Array of 1-2 actions (each max 5 words)
- idealVersion: 1 very short sentence (max 10 words)

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
Analyze these quality metrics with brutal honesty. IMPORTANT: Use the "WORD COUNT PER PAGE" data provided above to inform your word density assessment. DO NOT assume slides are empty just because they have fewer words - slides can be visual-heavy with images, charts, or diagrams.

${isImageBased ? '⚠️ FOR IMAGE-BASED DECKS: If the deck is image-based (minimal extractable text), note this explicitly in your feedback. Score Design as 50 (cannot assess without seeing images), but still assess the limited text content available. Emphasize that full visual analysis is required.' : ''}

- wordDensity: Assessment of text density per slide based on the word counts provided. Calculate the average words per page and classify: "Low" (<30 words/page average - minimal text, mostly visuals), "Medium" (30-80 words/page - balanced text and visuals), "High" (80-150 words/page - text-heavy but readable), "Very High" (>150 words/page - overwhelming text, slides too busy)${isImageBased ? ' If image-based, classify as "Low" and note that visual analysis is needed.' : ''}
- wordDensityFeedback: 2-3 sentences being brutally honest about text density based on the actual word counts per page. Acknowledge the specific distribution (e.g., "Page 1 has 200 words while pages 2-10 average 40 words"). DO NOT claim slides are empty unless word count is literally 0. Low word count can indicate visual-heavy slides (images, charts) which is often GOOD for pitch decks. If distribution is unbalanced (e.g., first slide very text-heavy, rest reasonable), state that specifically.${isImageBased ? ' For image-based decks, explicitly state that the deck is image-based and requires visual analysis to fully assess.' : ''}
- disruptionSignal: Score 0-100 measuring how disruptive/innovative the business idea is. Consider: market disruption potential, technology innovation, business model novelty, addressable pain points. Score 0-30: incremental improvement, 31-60: moderate innovation, 61-80: significant disruption potential, 81-100: revolutionary/paradigm-shifting. Be harsh - most ideas are not disruptive.
- disruptionSignalFeedback: 2-3 sentences of brutal truth about the innovation level. If it's just another SaaS tool or incremental improvement, say so plainly. Don't inflate mediocre ideas.
- pageCountFeedback: 2-3 sentences being direct about whether page count is appropriate. If it's too long, say it's bloated. If too short, say it's underdeveloped.
- overallScoreFeedback: 2-3 sentences explaining the overall score with brutal honesty. Directly state the core issues dragging the score down. No fluff.
- investmentGradeFeedback: 2-3 sentences explaining why this grade was assigned. Be direct about what separates this from A-grade decks. If it's mediocre, say so.
- fundingOddsFeedback: 2-3 sentences of harsh reality about funding chances. If odds are low, explain exactly why VCs would pass. Don't soften the message.

### BUSINESS SUMMARY:
Write a concise summary (100-150 words) covering:
- Problem/solution
- Key metrics
- Investment readiness verdict
- Critical gaps

## REQUIRED JSON FORMAT:

REMINDER: The pages array below MUST contain ALL ${pageCount} pages. Every page from 1 to ${pageCount} must be included.

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
    "teamFeedback": "<6-8 comprehensive sentences covering all team aspects>",
    "marketOpportunityScore": <0-100>,
    "marketOpportunityFeedback": "<6-8 comprehensive sentences covering all market aspects>",
    "productScore": <0-100>,
    "productFeedback": "<6-8 comprehensive sentences covering all product aspects>",
    "tractionScore": <0-100>,
    "tractionFeedback": "<6-8 comprehensive sentences covering all traction aspects>",
    "financialsScore": <0-100>,
    "financialsFeedback": "<6-8 comprehensive sentences covering all financial aspects>"
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
      "content": "<1 sentence>",
      "feedback": "<1-2 sentences>",
      "recommendations": ["<action 1>", "<action 2>"],
      "idealVersion": "<1 sentence>"
    },
    {
      "pageNumber": 2,
      "title": "<title>",
      "score": <0-100>,
      "content": "<1 sentence>",
      "feedback": "<1-2 sentences>",
      "recommendations": ["<action 1>", "<action 2>"],
      "idealVersion": "<1 sentence>"
    },
    ... CONTINUE FOR ALL ${pageCount} PAGES ...
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
    "wordDensityFeedback": "<2-3 brutal sentences about text density>",
    "disruptionSignal": <0-100>,
    "disruptionSignalFeedback": "<2-3 brutal sentences about innovation level>",
    "pageCountFeedback": "<2-3 brutal sentences about page count>",
    "overallScoreFeedback": "<2-3 brutal sentences explaining overall score>",
    "investmentGradeFeedback": "<2-3 brutal sentences explaining the grade>",
    "fundingOddsFeedback": "<2-3 brutal sentences about funding reality>"
  },
  "strengths": ["<detailed specific strength 1 (10-20 words)>", "<detailed specific strength 2 (10-20 words)>", ...],
  "issues": ["<detailed specific issue 1 (10-20 words)>", "<detailed specific issue 2 (10-20 words)>", ...],
  "detailedIssues": [
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

CRITICAL REQUIREMENTS:
1. Return ONLY the JSON object above. No explanations, no markdown, no code blocks. Start with { and end with }.
2. The pages array MUST include ALL ${pageCount} pages. Do not omit any pages.
3. KEEP ALL FEEDBACK EXTREMELY BRIEF. Each page entry should be minimal to fit all pages.
4. Priority: Include ALL pages > Detailed feedback. Brief feedback for all pages is better than detailed feedback for some.`;

    console.log('Calling OpenAI API for text-based analysis...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

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
              content: 'You are a brutally honest VC partner with 15+ years of experience. You provide direct, unfiltered feedback without sugarcoating. You call out weaknesses plainly and don\'t inflate scores or praise. Most decks are mediocre - treat them as such. Be thorough, accurate, and ruthlessly honest. Base your analysis strictly on the actual text content provided.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('OpenAI request timed out after 3 minutes. Please try again later.');
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
      console.log('Total pages in response:', analysis.totalPages);
      console.log('Pages array length:', analysis.pages?.length || 0);
      console.log('Expected page count from PDF:', pageCount);

      if (analysis.pages && analysis.pages.length < pageCount) {
        console.error(`⚠️ MISSING PAGES: OpenAI returned ${analysis.pages.length} pages but PDF has ${pageCount} pages!`);
        console.error('Pages returned:', analysis.pages.map((p: any) => p.pageNumber));
      }

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

    if (!user && !sessionId) {
      throw new Error('Either authentication or session ID is required');
    }

    const analysisData: any = {
      user_id: user?.id || null,
      session_id: !user ? sessionId : null,
      file_name: file.name,
      file_size: file.size,
      overall_score: analysis.overallScore,
      total_pages: analysis.totalPages,
      summary: analysis.summary,
      funding_stage: analysis.stageAssessment?.detectedStage || null,
      investment_ready: analysis.investmentReadiness?.isInvestmentReady || false,
      word_density: analysis.deckQualityMetrics?.wordDensity || 'Not analyzed',
      disruption_signal: analysis.deckQualityMetrics?.disruptionSignal || 0,
      overall_score_feedback: analysis.deckQualityMetrics?.overallScoreFeedback || null,
      investment_grade_feedback: analysis.deckQualityMetrics?.investmentGradeFeedback || null,
      funding_odds_feedback: analysis.deckQualityMetrics?.fundingOddsFeedback || null,
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

    if (analysis.pages && analysis.pages.length > 0) {
      let pagesData = analysis.pages.map((page: any) => {
        const imagePath = `slide-images/${analysisId}/page_${page.pageNumber}.jpg`;
        return {
          analysis_id: analysisId,
          page_number: page.pageNumber,
          title: page.title,
          score: page.score,
          content: page.content || null,
          feedback: page.feedback || null,
          recommendations: page.recommendations || [],
          ideal_version: page.idealVersion || null,
          image_url: imagePath,
          thumbnail_url: imagePath,
        };
      });

      if (analysis.pages.length < pageCount) {
        console.warn(`Creating placeholder pages for ${pageCount - analysis.pages.length} missing pages`);
        const returnedPageNumbers = new Set(analysis.pages.map((p: any) => p.pageNumber));

        for (let i = 1; i <= pageCount; i++) {
          if (!returnedPageNumbers.has(i)) {
            const imagePath = `slide-images/${analysisId}/page_${i}.jpg`;
            pagesData.push({
              analysis_id: analysisId,
              page_number: i,
              title: `Slide ${i}`,
              score: 50,
              content: 'Page requires detailed analysis',
              feedback: 'This page will be analyzed when you upload slide images',
              recommendations: ['Upload slide images for detailed visual analysis'],
              ideal_version: null,
              image_url: imagePath,
              thumbnail_url: imagePath,
            });
          }
        }

        pagesData.sort((a, b) => a.page_number - b.page_number);
      }

      console.log(`Inserting ${pagesData.length} pages with detailed feedback and image URLs`);
      console.log('Page numbers:', pagesData.map((p: any) => p.page_number));
      await supabase.from('analysis_pages').insert(pagesData);
    } else {
      console.warn('No pages returned by OpenAI, creating placeholders for all pages');
      const pagesData = [];
      for (let i = 1; i <= pageCount; i++) {
        const imagePath = `slide-images/${analysisId}/page_${i}.jpg`;
        pagesData.push({
          analysis_id: analysisId,
          page_number: i,
          title: `Slide ${i}`,
          score: 50,
          content: 'Page requires detailed analysis',
          feedback: 'This page will be analyzed when you upload slide images',
          recommendations: ['Upload slide images for detailed visual analysis'],
          ideal_version: null,
          image_url: imagePath,
          thumbnail_url: imagePath,
        });
      }
      console.log(`Inserting ${pagesData.length} placeholder pages`);
      await supabase.from('analysis_pages').insert(pagesData);
    }

    if (analysis.metrics) {
      console.log('Inserting metrics:', analysis.metrics);
      await supabase.from('analysis_metrics').insert({
        analysis_id: analysisId,
        strengths: analysis.strengths || [],
        weaknesses: analysis.issues || [],
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

    if (analysis.detailedIssues && analysis.detailedIssues.length > 0) {
      console.log(`Inserting ${analysis.detailedIssues.length} detailed issues`);
      await supabase.from('analysis_issues').insert(
        analysis.detailedIssues.map((issue: any) => ({
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
        team_feedback: analysis.investmentReadiness.teamFeedback || null,
        market_opportunity_score: analysis.investmentReadiness.marketOpportunityScore,
        market_opportunity_feedback: analysis.investmentReadiness.marketOpportunityFeedback || null,
        product_score: analysis.investmentReadiness.productScore,
        product_feedback: analysis.investmentReadiness.productFeedback || null,
        traction_score: analysis.investmentReadiness.tractionScore,
        traction_feedback: analysis.investmentReadiness.tractionFeedback || null,
        financials_score: analysis.investmentReadiness.financialsScore,
        financials_feedback: analysis.investmentReadiness.financialsFeedback || null,
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