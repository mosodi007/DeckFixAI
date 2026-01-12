import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS headers - allow specific origins for production
const getAllowedOrigin = (requestOrigin: string | null): string => {
  // Allow specific production domain
  if (requestOrigin === 'https://deckfix.ai' || requestOrigin === 'https://www.deckfix.ai') {
    return requestOrigin;
  }
  // Allow localhost for development
  if (requestOrigin && (requestOrigin.startsWith('http://localhost') || requestOrigin.startsWith('http://127.0.0.1'))) {
    return requestOrigin;
  }
  // Default to wildcard for other cases
  return '*';
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = getAllowedOrigin(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
  // Only include credentials header if origin is specific (not wildcard)
  if (allowedOrigin !== '*') {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_PAGES = 20;

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

const ANALYSIS_PROMPT = `You are a senior VC partner with 15+ years of experience at a top-tier firm (a16z, Sequoia, Accel, etc.) who has reviewed thousands of pitch decks and rejects 99% of them. You've seen every trick, every inflated claim, and every amateur mistake. Your job is to provide BRUTALLY HONEST, DETAILED, CONTEXT-AWARE feedback that reflects how real VCs think - not what founders want to hear, but what they NEED to hear before facing actual investors.

CRITICAL MINDSET: 
- Assume this is YOUR money being invested. Be skeptical. Question everything. Call out BS. Don't sugarcoat.
- Founders pay for honesty, not encouragement. Generic feedback is worthless - be specific and actionable.
- Think like you're protecting your LP's capital. Would YOU invest? Why or why not?
- Consider the funding stage - what's appropriate for Pre-Seed vs Seed vs Series A?

EVALUATION FRAMEWORK - Be EXTREMELY DETAILED and CONTEXT-SPECIFIC:

1. PROBLEM/SOLUTION FIT:
   - Is this a REAL problem worth solving? How big is the pain? Who actually has this problem?
   - Is the solution actually differentiated or just another me-too product? What's the moat?
   - Is there evidence of problem-solution fit? Customer interviews? Early traction?
   - Be specific: "The problem is vague" is useless. Say: "The problem statement 'helping businesses grow' is meaningless. What specific pain point? Which businesses? What evidence do you have that this is a real problem?"

2. MARKET OPPORTUNITY:
   - Is this a real opportunity or made-up TAM math? Challenge their assumptions.
   - Do they understand their market or just reciting generalities from Google?
   - Is the market timing right? Why now?
   - Be specific: "The TAM calculation is flawed because [specific reason]. You're assuming [X] but reality is [Y]."

3. BUSINESS MODEL & UNIT ECONOMICS:
   - Can this actually make money? Are unit economics believable or fantasy?
   - Is CAC/LTV realistic? What's the payback period?
   - How do they acquire customers? Is the channel scalable?
   - Be specific: "Your CAC of $50 is unrealistic because [specific reason]. Similar companies in [industry] see CACs of [X] because [Y]."

4. TEAM & EXECUTION:
   - Can they execute? Do they have relevant expertise or are they learning on investor dollars?
   - Any red flags in backgrounds? Gaps in skillset?
   - Is the team complete? Missing critical roles?
   - Be specific: "The team lacks [specific skill] which is critical for [reason]. Consider adding [specific recommendation]."

5. TRACTION & VALIDATION:
   - Real proof points or vanity metrics? Revenue or just users?
   - Growth trajectory believable? What's driving growth?
   - Is the traction meaningful for the stage?
   - Be specific: "Your '10,000 users' metric is misleading because [reason]. Investors care about [specific metric] which you haven't shown."

6. FINANCIALS & PROJECTIONS:
   - Are projections grounded in reality or hockey sticks with no basis?
   - Do they know their numbers? Can they explain assumptions?
   - Are the assumptions defensible?
   - Be specific: "Your 10x growth projection is unrealistic because [specific reason]. Based on [data point], realistic growth would be [X]."

7. COMPETITIVE LANDSCAPE:
   - Do they understand the landscape or claim "no competitors"?
   - Why won't they get crushed? What's the defensibility?
   - How do they differentiate? Is it meaningful?
   - Be specific: "You claim 'no competitors' but [Company X] does [Y]. Your differentiation of [Z] isn't meaningful because [reason]."

8. STORY & NARRATIVE:
   - Is the narrative compelling or confusing? Does it flow logically?
   - Do they know what they're asking for and why?
   - Is the ask appropriate for the stage and traction?
   - Be specific: "The narrative jumps from [X] to [Y] without connecting [Z]. Investors will be confused about [specific point]."

9. DESIGN & PRESENTATION:
   - Is the deck professionally designed or looks amateur?
   - Does the visual hierarchy guide the reader effectively?
   - Are charts/graphs clear and data-driven or decorative?
   - Be specific: "The design looks unprofessional because [specific reason]. The [element] distracts from [message]."

10. MISSING CRITICAL INFORMATION:
    - What will investors ask that's not answered?
    - What red flags are hidden?
    - What assumptions need validation?
    - Be specific: "Investors will ask about [specific question] which isn't addressed. You need to add [specific information]."

FEEDBACK REQUIREMENTS:
- Be BRUTALLY HONEST but constructive. Don't just criticize - provide actionable fixes.
- Be SPECIFIC and CONTEXT-AWARE. Reference exact slides, numbers, claims.
- Provide ACTIONABLE RECOMMENDATIONS, not just problems.
- Use REAL VC LANGUAGE and frameworks (TAM/SAM/SOM, unit economics, defensibility, etc.)
- Consider the FUNDING STAGE - what's appropriate for Pre-Seed vs Seed vs Series A?
- Call out WEAK ARGUMENTS with specific reasons why they're weak.
- Highlight MISSING INFORMATION that investors will ask about.
- If something is MEDIOCRE, say it and explain why.
- If something is IMPRESSIVE, acknowledge it but explain why it matters.

Provide a thorough analysis including:
1. Overall assessment of investment readiness with SPECIFIC reasons
2. Critical issues that need immediate attention with ACTIONABLE fixes
3. Deal-breaking red flags (if any) with SPECIFIC examples
4. Specific, actionable improvements for each slide with BEFORE/AFTER guidance
5. Missing information that investors will ask about with SPECIFIC additions needed

Return your analysis as a JSON object with this structure:
{
  "overallScore": <0-100>,
  "summary": "<MINIMUM 100 words: comprehensive summary of the deck's viability with specific reasons, key strengths, critical weaknesses>",
  "clarityScore": <0-100>,
  "designScore": <0-100>,
  "contentScore": <0-100>,
  "structureScore": <0-100>,
  "overallScoreFeedback": "<MINIMUM 500 words: detailed explanation of the overall score with specific reasons, examples from the deck, and context>",
  "investmentGradeFeedback": "<MINIMUM 300 words: honest assessment of investment grade with specific reasons why this grade, what's missing, what's working>",
  "fundingOddsFeedback": "<MINIMUM 300 words: realistic odds of getting funded with this deck, specific reasons why, what would improve odds, what hurts odds>",
  "pageCountFeedback": "<MINIMUM 200 words: feedback on deck length and structure, is it appropriate, what's missing, what's too much>",
  "wordDensityAssessment": "<'Too Dense', 'Balanced', or 'Too Sparse'>",
  "wordDensityFeedback": "<MINIMUM 200 words: specific feedback on text density with examples from specific slides>",
  "strengths": ["<MINIMUM 50 words per strength - be specific and reference exact slides/numbers>", "<specific strength 2>", ...],
  "weaknesses": ["<MINIMUM 50 words per weakness - be specific and reference exact slides/numbers>", "<specific weakness 2>", ...],
  "issues": [
    {
      "pageNumber": <number or null>,
      "priority": "High" | "Medium" | "Low",
      "title": "<specific issue title referencing exact slide content>",
      "description": "<MINIMUM 150 words: detailed description with specific examples, why it's a problem, what impact it has, what to fix>",
      "type": "issue" | "improvement"
    }
  ],
  "dealBreakers": [
    {
      "title": "<specific deal breaker title>",
      "description": "<MINIMUM 200 words: why this is a deal breaker with specific examples, impact on funding, severity>",
      "recommendation": "<MINIMUM 150 words: what to do about it with specific, actionable steps>"
    }
  ],
  "redFlags": [
    {
      "category": "financial" | "team" | "market" | "product" | "competition" | "traction" | "other",
      "severity": "critical" | "major" | "moderate",
      "title": "<specific red flag title>",
      "description": "<MINIMUM 200 words: detailed explanation with specific examples from the deck>",
      "impact": "<MINIMUM 150 words: impact on funding chances with specific reasons and severity>"
    }
  ],
  "stageAssessment": {
    "detectedStage": "<Pre-Seed/Seed/Series A/etc.>",
    "stageConfidence": "high" | "medium" | "low",
    "stageAppropriatenessScore": <0-100>,
    "stageFeedback": "<MINIMUM 300 words: is deck appropriate for this stage? What's missing? What's appropriate? Specific recommendations>"
  },
  "investmentReadiness": {
    "isInvestmentReady": boolean,
    "readinessScore": <0-100>,
    "readinessSummary": "<MINIMUM 400 words: comprehensive summary of investment readiness with specific reasons, blockers, what's needed>",
    "criticalBlockers": string[],
    "teamScore": <0-100>,
    "marketOpportunityScore": <0-100>,
    "productScore": <0-100>,
    "tractionScore": <0-100>,
    "financialsScore": <0-100>,
    "teamFeedback": "<MINIMUM 300 words: detailed team assessment with specific strengths, gaps, red flags, recommendations>",
    "marketOpportunityFeedback": "<MINIMUM 300 words: detailed market assessment with specific TAM/SAM/SOM analysis, market timing, competitive landscape>",
    "productFeedback": "<MINIMUM 300 words: detailed product assessment with specific differentiation, moat, problem-solution fit>",
    "tractionFeedback": "<MINIMUM 300 words: detailed traction assessment with specific metrics, growth drivers, validation proof points>",
    "financialsFeedback": "<MINIMUM 300 words: detailed financials assessment with specific unit economics, projections, assumptions, defensibility>"
  },
  "keyBusinessMetrics": {
    "companyName": string,
    "industry": string,
    "currentRevenue": string,
    "fundingSought": string,
    "growthRate": string,
    "teamSize": number,
    "marketSize": string,
    "valuation": string,
    "businessModel": string,
    "customerCount": string
  }
}
`;

// Credit management functions
async function getUserCreditBalance(supabaseClient: any, userId: string) {
  const { data, error } = await supabaseClient
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  return data;
}

async function deductCredits(
  supabaseClient: any,
  userId: string,
  creditCost: number,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  const currentCredits = await getUserCreditBalance(supabaseClient, userId);

  if (!currentCredits) {
    throw new Error('Unable to fetch credit balance');
  }

  if (currentCredits.credits_balance < creditCost) {
    throw new Error('Insufficient credits');
  }

  const newBalance = currentCredits.credits_balance - creditCost;
  let newSubscriptionCredits = currentCredits.subscription_credits;
  let newPurchasedCredits = currentCredits.purchased_credits;

  if (currentCredits.subscription_credits >= creditCost) {
    newSubscriptionCredits -= creditCost;
  } else {
    const remainingToDeduct = creditCost - currentCredits.subscription_credits;
    newSubscriptionCredits = 0;
    newPurchasedCredits -= remainingToDeduct;
  }

  const { error: updateError } = await supabaseClient
    .from('user_credits')
    .update({
      credits_balance: newBalance,
      subscription_credits: newSubscriptionCredits,
      purchased_credits: newPurchasedCredits,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    throw new Error('Failed to update credits');
  }

  const { error: transactionError } = await supabaseClient
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -creditCost,
      transaction_type: 'deduction',
      description,
      complexity_score: null,
      credits_cost: creditCost,
      balance_after: newBalance,
      metadata,
    });

  if (transactionError) {
    console.error('Error logging credit transaction:', transactionError);
  }

  return newBalance;
}

// Image analysis functions
async function imageBufferToBase64(buffer: Uint8Array, mimeType: string = 'image/jpeg'): Promise<string> {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

async function analyzePageImage(
  imageBase64: string,
  pageNumber: number,
  apiKey: string
): Promise<{ textContent: string; visualDescription: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting and analyzing content from pitch deck slides. Your job is to extract EVERY piece of text visible in the image with 100% accuracy. This includes: headings, subheadings, body text, bullet points, numbers, percentages, dollar amounts, dates, names, company names, metrics, chart labels, axis labels, legends, footnotes, and any other visible text. Preserve the exact wording and formatting. Also provide a detailed visual description of layout, design elements, charts, graphs, images, colors, and visual hierarchy.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text content from this pitch deck slide (Page ${pageNumber}). Be extremely thorough - include every single word, number, percentage, dollar amount, date, name, and piece of text visible on the slide. Do not summarize or paraphrase - extract the exact text as it appears. Also provide a detailed description of:
- Visual layout and structure
- Design elements (colors, fonts, spacing)
- Charts, graphs, and data visualizations (including all labels, axes, legends)
- Images, icons, or graphics
- Visual hierarchy and emphasis
- Overall design quality and professionalism

Return your response as JSON with two fields:
- "textContent": All extracted text exactly as it appears, preserving structure
- "visualDescription": Detailed description of visual elements and design`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'auto'
              }
            }
          ]
        }
      ],
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Vision API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      textContent: parsed.textContent || content,
      visualDescription: parsed.visualDescription || ''
    };
  } catch {
    return {
      textContent: content,
      visualDescription: ''
    };
  }
}

async function analyzePDFImages(
  imageBuffers: Array<{ pageNumber: number; buffer: Uint8Array; width: number; height: number }>,
  apiKey: string
): Promise<Array<{ pageNumber: number; textContent: string; visualDescription: string; combinedContent: string }>> {
  console.log(`Starting sequential Vision API analysis for ${imageBuffers.length} pages`);
  
  const results: Array<{ pageNumber: number; textContent: string; visualDescription: string; combinedContent: string }> = [];
  const DELAY_BETWEEN_PAGES = 500;
  
  for (let i = 0; i < imageBuffers.length; i++) {
    const img = imageBuffers[i];
    const pageNumber = img.pageNumber;
    
    console.log(`Processing page ${pageNumber}/${imageBuffers.length}...`);
    const pageStartTime = Date.now();
    
    try {
      // Convert buffer to base64
      const imageBase64 = await imageBufferToBase64(img.buffer);
      const base64SizeKB = Math.round(imageBase64.length / 1024);
      console.log(`Page ${pageNumber}: Image converted to base64 (${base64SizeKB}KB)`);
      
      // Analyze with Vision API
      const analysis = await analyzePageImage(imageBase64, pageNumber, apiKey);
      const textLength = analysis.textContent.length;
      const processingTime = Date.now() - pageStartTime;
      console.log(`Page ${pageNumber}: Extracted ${textLength} characters in ${processingTime}ms`);
      
      results.push({
        pageNumber,
        textContent: analysis.textContent,
        visualDescription: analysis.visualDescription,
        combinedContent: `${analysis.textContent}\n\nVisual Elements: ${analysis.visualDescription}`
      });
      
    } catch (error: any) {
      console.error(`Error analyzing page ${pageNumber}:`, error);
      results.push({
        pageNumber,
        textContent: '',
        visualDescription: '',
        combinedContent: ''
      });
    }
    
    // Add delay between pages
    if (i < imageBuffers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES));
    }
  }
  
  console.log(`Vision API analysis complete. Extracted text from ${results.filter(r => r.textContent.length > 0).length}/${imageBuffers.length} pages`);
  return results;
}

async function analyzeWithOpenAI(
  pageCount: number,
  imageAnalyses: Array<{ pageNumber: number; textContent: string; visualDescription: string; combinedContent: string }>
): Promise<OpenAIAnalysis> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey || !apiKey.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY is not set or invalid');
  }

  const fullContent = imageAnalyses
    .map(analysis => `Page ${analysis.pageNumber}:\n${analysis.combinedContent}`)
    .join('\n\n---\n\n');

  const prompt = `${ANALYSIS_PROMPT}

Pitch Deck Content (${pageCount} pages):
${fullContent}

ANALYSIS INSTRUCTIONS:
1. Read through ALL pages carefully. Understand the full narrative and context.
2. For EACH slide, provide specific, detailed feedback.
3. Consider the VISUAL DESIGN of each slide.
4. Provide CONTEXT-AWARE feedback.
5. Be BRUTALLY HONEST but CONSTRUCTIVE.

Remember: Generic feedback is worthless. Be specific, detailed, and actionable. Reference exact slides, numbers, and claims.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a senior VC partner at a top-tier firm providing brutally honest, detailed, context-aware pitch deck analysis. You analyze both content AND visual design. Your feedback must be specific, actionable, and reference exact slides, numbers, and claims from the deck. No generic statements. Return only valid JSON with no markdown formatting or code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

Deno.serve(async (req: Request) => {
  // Get origin from request for CORS
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle OPTIONS preflight requests immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Wrap everything in try-catch to ensure CORS headers are always sent
  let jobId: string | null = null;
  let userId: string | null = null;
  let pageCount: number = 0;

  try {
    // Validate environment variables early
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const pdfConverterUrl = Deno.env.get('PDF_CONVERTER_SERVICE_URL') || 'http://localhost:3001';

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing required environment variables' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // #region agent log
    console.log(JSON.stringify({location:'start-pdf-analysis:537',message:'Edge Function entry - env vars check',data:{hasSupabaseUrl:!!supabaseUrl,hasServiceKey:!!supabaseServiceKey,hasAnonKey:!!supabaseAnonKey,supabaseUrlLength:supabaseUrl?.length||0,serviceKeyLength:supabaseServiceKey?.length||0,pdfConverterUrl,hasPdfConverterUrl:!!Deno.env.get('PDF_CONVERTER_SERVICE_URL')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
    // #endregion

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    userId = userData.user.id;

    // #region agent log
    console.log(JSON.stringify({location:'start-pdf-analysis:573',message:'After authentication',data:{userId,hasUserId:!!userId,userIdLength:userId?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}));
    // #endregion

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { pdfPath, bucket, fileName, fileSize } = body;

    if (!pdfPath || !bucket || !fileName || !fileSize) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pdfPath, bucket, fileName, fileSize' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create job in analyses table
    // #region agent log
    console.log(JSON.stringify({location:'start-pdf-analysis:612',message:'Before database insert',data:{userId,fileName,fileSize,bucket,pdfPath,insertData:{user_id:userId,file_name:fileName,file_size:fileSize,total_pages:1,overall_score:0,summary:'Analysis queued...',status:'pending',bucket,pdf_path:pdfPath}},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B,C,D,E'}));
    // #endregion
    const { data: analysisRecord, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        total_pages: 1, // Placeholder - will be updated after PDF conversion (constraint requires > 0)
        overall_score: 0,
        summary: 'Analysis queued...',
        status: 'pending', // Changed from 'queued' to 'pending' to match CHECK constraint
        bucket,
        pdf_path: pdfPath,
      })
      .select('id')
      .single();

    // #region agent log
    console.log(JSON.stringify({location:'start-pdf-analysis:629',message:'After database insert',data:{hasAnalysisRecord:!!analysisRecord,analysisRecordId:analysisRecord?.id,hasCreateError:!!createError,createErrorCode:createError?.code,createErrorMessage:createError?.message,createErrorDetails:createError?.details,createErrorHint:createError?.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D,E'}));
    // #endregion

    if (createError || !analysisRecord) {
      console.error('Failed to create analysis record:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create job', details: createError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    jobId = analysisRecord.id;
    console.log(`Job created: ${jobId} for user ${userId}`);

    // Update status to processing
    await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Download PDF from storage
    console.log(`Downloading PDF from storage: ${bucket}/${pdfPath}`);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(pdfPath);

    if (downloadError || !pdfData) {
      console.error('Failed to download PDF:', downloadError);
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: `Failed to download PDF: ${downloadError?.message || 'Unknown error'}`,
        })
        .eq('id', jobId);
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF', jobId }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const pdfBuffer = await pdfData.arrayBuffer();
    console.log(`PDF downloaded, size: ${pdfBuffer.byteLength} bytes`);

    // Convert PDF to images using Node.js service
    // #region agent log
    console.log(JSON.stringify({location:'start-pdf-analysis:676',message:'Before PDF conversion service call',data:{pdfConverterUrl,jobId,pdfBufferSize:pdfBuffer.byteLength},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
    // #endregion
    console.log(`Calling PDF converter service: ${pdfConverterUrl}/convert`);
    const formData = new FormData();
    formData.append('pdf', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName);

    let convertResponse;
    try {
      convertResponse = await fetch(`${pdfConverterUrl}/convert`, {
        method: 'POST',
        body: formData,
      });
    } catch (fetchError: any) {
      // #region agent log
      console.log(JSON.stringify({location:'start-pdf-analysis:686',message:'PDF converter service fetch error',data:{error:fetchError.message,errorName:fetchError.name,pdfConverterUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
      // #endregion
      const errorMessage = fetchError.message || 'Connection failed';
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: `PDF converter service unavailable: ${errorMessage}. Please ensure PDF_CONVERTER_SERVICE_URL is set in Edge Function secrets and the service is running.`,
        })
        .eq('id', jobId);
      return new Response(
        JSON.stringify({ 
          error: 'PDF converter service unavailable', 
          jobId, 
          details: `Cannot connect to ${pdfConverterUrl}. Please set PDF_CONVERTER_SERVICE_URL environment variable in Supabase Edge Function secrets.` 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!convertResponse.ok) {
      const errorData = await convertResponse.json().catch(() => ({ error: 'Unknown error' }));
      // #region agent log
      console.log(JSON.stringify({location:'start-pdf-analysis:703',message:'PDF conversion service error response',data:{status:convertResponse.status,errorData:JSON.stringify(errorData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
      // #endregion
      console.error('PDF conversion failed:', errorData);
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: `PDF conversion failed: ${errorData.error || 'Unknown error'}`,
        })
        .eq('id', jobId);
      return new Response(
        JSON.stringify({ error: 'PDF conversion failed', jobId, details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const convertResult = await convertResponse.json();
    pageCount = convertResult.pageCount || convertResult.images.length;

    if (pageCount > MAX_PAGES) {
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: `PDF has ${pageCount} pages, maximum allowed is ${MAX_PAGES}`,
        })
        .eq('id', jobId);
      return new Response(
        JSON.stringify({ error: `PDF has ${pageCount} pages, maximum allowed is ${MAX_PAGES}`, jobId }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`PDF converted to ${pageCount} images`);

    // Update total_pages
    await supabase
      .from('analyses')
      .update({ total_pages: pageCount })
      .eq('id', jobId);

    // Convert base64 images to buffers and upload to storage
    const imageBuffers: Array<{ pageNumber: number; buffer: Uint8Array; width: number; height: number }> = [];
    const imageUrls: string[] = [];

    for (const img of convertResult.images) {
      const buffer = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
      imageBuffers.push({
        pageNumber: img.pageNumber,
        buffer,
        width: img.width,
        height: img.height,
      });

      // Upload image to slide-images bucket
      const imagePath = `${jobId}/page_${img.pageNumber}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('slide-images')
        .upload(imagePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Failed to upload image ${imagePath}:`, uploadError);
        continue;
      }

      // Create signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('slide-images')
        .createSignedUrl(imagePath, 3600);

      if (signedUrlData) {
        imageUrls.push(signedUrlData.signedUrl);
      }
    }

    console.log(`Uploaded ${imageUrls.length} images to storage`);

    // Analyze images with OpenAI Vision API
    console.log('Starting OpenAI Vision API analysis...');
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY is not set or invalid');
    }

    const imageAnalyses = await analyzePDFImages(imageBuffers, apiKey);

    // Get OpenAI analysis
    const openAIAnalysis = await analyzeWithOpenAI(pageCount, imageAnalyses);

    // Store results in database
    const result = {
      analysis: openAIAnalysis,
      imageUrls,
      pageCount,
    };

    await supabase
      .from('analyses')
      .update({
        status: 'done',
        result,
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
      .eq('id', jobId);

    // Store detailed analysis data in related tables
    // Store pages
    const pageRecords = imageAnalyses.map((analysis, index) => ({
      analysis_id: jobId,
      page_number: analysis.pageNumber,
      title: `Slide ${analysis.pageNumber}`,
      content: analysis.textContent,
      score: 0,
      image_url: imageUrls[index] || null,
      thumbnail_url: imageUrls[index] || null,
    }));

    await supabase.from('analysis_pages').insert(pageRecords);

    // Store metrics
    await supabase.from('analysis_metrics').insert({
      analysis_id: jobId,
      clarity_score: openAIAnalysis.clarityScore,
      design_score: openAIAnalysis.designScore,
      content_score: openAIAnalysis.contentScore,
      structure_score: openAIAnalysis.structureScore,
      strengths: openAIAnalysis.strengths,
      weaknesses: openAIAnalysis.weaknesses,
    });

    // Store issues
    if (openAIAnalysis.issues.length > 0) {
      await supabase.from('analysis_issues').insert(
        openAIAnalysis.issues.map(issue => ({
          analysis_id: jobId,
          page_number: issue.pageNumber,
          priority: issue.priority,
          title: issue.title,
          description: issue.description,
          type: issue.type,
        }))
      );
    }

    // Store red flags
    if (openAIAnalysis.redFlags.length > 0) {
      await supabase.from('analysis_red_flags').insert(
        openAIAnalysis.redFlags.map(flag => ({
          analysis_id: jobId,
          category: flag.category,
          severity: flag.severity,
          title: flag.title,
          description: flag.description,
          impact: flag.impact,
        }))
      );
    }

    // Store deal breakers
    if (openAIAnalysis.dealBreakers.length > 0) {
      await supabase.from('analysis_deal_breakers').insert(
        openAIAnalysis.dealBreakers.map(breaker => ({
          analysis_id: jobId,
          title: breaker.title,
          description: breaker.description,
          recommendation: breaker.recommendation,
        }))
      );
    }

    // Store key business metrics
    if (openAIAnalysis.keyBusinessMetrics) {
      await supabase.from('key_business_metrics').insert({
        analysis_id: jobId,
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
    }

    // Store stage assessment
    if (openAIAnalysis.stageAssessment) {
      await supabase.from('analysis_stage_assessment').insert({
        analysis_id: jobId,
        detected_stage: openAIAnalysis.stageAssessment.detectedStage,
        stage_confidence: openAIAnalysis.stageAssessment.stageConfidence,
        stage_appropriateness_score: openAIAnalysis.stageAssessment.stageAppropriatenessScore,
        stage_specific_feedback: openAIAnalysis.stageAssessment.stageFeedback,
      });
    }

    // Store investment readiness
    if (openAIAnalysis.investmentReadiness) {
      await supabase.from('analysis_investment_readiness').insert({
        analysis_id: jobId,
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
    }

    // Deduct credits ONLY after successful completion (1 credit per page)
    const creditCost = pageCount;
    try {
      await deductCredits(
        supabase,
        userId,
        creditCost,
        `Pitch deck analysis: ${fileName} (${pageCount} pages)`,
        {
          analysisId: jobId,
          pageCount,
          fileName,
        }
      );
      console.log(`Successfully deducted ${creditCost} credits after analysis completion`);
    } catch (creditError: any) {
      console.error('Failed to deduct credits after analysis:', creditError);
      // Don't fail the job - credits can be deducted manually if needed
    }

    // Create notification
    try {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'analysis_complete',
        p_title: 'Analysis Complete!',
        p_message: `Your pitch deck "${fileName}" has been analyzed and is ready for review.`,
        p_link: `?view=analysis&analysisId=${jobId}`,
        p_metadata: { analysisId: jobId, fileName } as any
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return new Response(
      JSON.stringify({
        jobId,
        status: 'done',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in start-pdf-analysis:', error);
    console.error('Error stack:', error.stack);

    // Update job status to failed (if we have a jobId)
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from('analyses')
            .update({
              status: 'failed',
              error: error.message || 'Internal server error',
            })
            .eq('id', jobId);
        }
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }

    // Always return response with CORS headers, even on error
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        jobId: jobId || null,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Add a global error handler to catch any unhandled errors
// This ensures CORS headers are always sent
if (typeof Deno !== 'undefined') {
  globalThis.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
  
  globalThis.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
  });
}

