import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { extractTextFromPDF } from './pdfExtractor.ts';
import { analyzePDFImages } from './imageAnalyzer.ts';

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
    "isInvestmentReady": <boolean>,
    "readinessScore": <0-100>,
    "readinessSummary": "<MINIMUM 400 words: comprehensive summary of investment readiness with specific reasons, blockers, what's needed>",
    "criticalBlockers": ["<blocker 1>", "<blocker 2>", ...],
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

async function analyzeWithOpenAI(
  text: string, 
  pageCount: number,
  imageAnalyses?: Array<{ pageNumber: number; textContent: string; visualDescription: string; combinedContent: string }>
): Promise<OpenAIAnalysis> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // Build comprehensive content from both text extraction and vision analysis
  let fullContent = '';
  
  if (imageAnalyses && imageAnalyses.length > 0) {
    // Use Vision API extracted content (more reliable)
    console.log('Using Vision API extracted content for analysis');
    const visionContent = imageAnalyses
      .map(analysis => `Page ${analysis.pageNumber}:\n${analysis.combinedContent}`)
      .join('\n\n---\n\n');
    fullContent = visionContent;
    
    // Append traditional text extraction as supplement if available
    if (text && text.trim().length > 0) {
      fullContent += `\n\n---\n\nAdditional Text Extraction:\n${text}`;
    }
  } else {
    // Fallback to traditional text extraction
    console.log('Using traditional text extraction (Vision API not available)');
    fullContent = text || 'No content could be extracted from the PDF.';
  }

  const prompt = `${ANALYSIS_PROMPT}

Pitch Deck Content (${pageCount} pages):
${fullContent}

ANALYSIS INSTRUCTIONS:
1. Read through ALL pages carefully. Understand the full narrative and context.
2. For EACH slide, provide specific, detailed feedback:
   - What's on the slide (be specific about content)
   - What's working and why
   - What's NOT working and why (be brutally honest)
   - Specific, actionable recommendations to fix it
   - Missing information that should be added
3. Consider the VISUAL DESIGN of each slide:
   - Layout quality and professionalism (be specific: "The text is too small" not "design is bad")
   - Visual hierarchy and readability (what guides the eye? Is it effective?)
   - Use of charts, graphs, and data visualization (are they clear? Do they tell a story?)
   - Color scheme and branding consistency (does it look professional?)
   - Overall design polish (does it look like a $10M company or a $10K company?)
4. Provide CONTEXT-AWARE feedback:
   - Consider the funding stage - is this appropriate for Pre-Seed, Seed, or Series A?
   - Compare to industry standards - how does this stack up?
   - Reference specific numbers, claims, or statements from the deck
5. Be BRUTALLY HONEST but CONSTRUCTIVE:
   - Don't sugarcoat - if something is weak, say it and explain why
   - Provide SPECIFIC fixes, not generic advice
   - Use real VC frameworks and language
   - Give actionable recommendations that can be implemented

Remember: Generic feedback is worthless. Be specific, detailed, and actionable. Reference exact slides, numbers, and claims.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Use GPT-4o for better analysis quality
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
      temperature: 0.8, // Slightly higher for more creative but still accurate analysis
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
    if (authHeader) {
      console.log('Auth header length:', authHeader.length);
      console.log('Auth header starts with Bearer:', authHeader.startsWith('Bearer '));
    }

    let user = null;
    let authError = null;

    if (authHeader) {
      const supabaseClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      if (userError) {
        authError = userError;
        console.error('Auth error:', userError.message);
      }
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('Authenticated user:', user.id, 'Is anonymous:', user.is_anonymous);
      } else if (!userError && !userData?.user) {
        console.log('No user data returned from auth.getUser()');
      }
    } else {
      console.log('No Authorization header provided');
    }

    if (!user) {
      console.log('No authenticated user found');
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
    let imageAnalyses: Array<{ pageNumber: number; textContent: string; visualDescription: string; combinedContent: string }> | undefined;

    // Step 1: Extract text from PDF (fallback method)
    try {
      const result = await extractTextFromPDF(arrayBuffer);
      text = result.text;
      pageCount = result.pageCount;
      pages = result.pages;
      
      console.log(`PDF text extraction: ${text.length} characters from ${pageCount} pages`);
    } catch (pdfError: any) {
      console.error('PDF text extraction failed:', pdfError);
      // Don't throw - we'll use Vision API instead
      text = '';
      pageCount = imageUrls.length || 0;
      pages = [];
    }

    const analysisId = clientAnalysisId || crypto.randomUUID();
    console.log('Analysis ID:', analysisId);

    // Step 2: Use OpenAI Vision API to analyze page images (primary method)
    if (imageUrls && imageUrls.length > 0) {
      console.log(`Starting Vision API analysis for ${imageUrls.length} page images...`);
      try {
        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        
        imageAnalyses = await analyzePDFImages(imageUrls, apiKey);
        
        // Update pageCount if we got more pages from images
        if (imageAnalyses.length > pageCount) {
          pageCount = imageAnalyses.length;
        }
        
        // Merge Vision API results with traditional extraction
        pages = imageAnalyses.map(analysis => ({
          pageNumber: analysis.pageNumber,
          text: analysis.textContent
        }));
        
        // Combine all extracted text
        text = imageAnalyses.map(a => a.combinedContent).join('\n\n---\n\n');
        
        console.log(`Vision API analysis complete: ${imageAnalyses.filter(a => a.textContent.length > 0).length} pages with content`);
      } catch (visionError: any) {
        console.error('Vision API analysis failed:', visionError);
        console.warn('Falling back to traditional text extraction');
        // Continue with text extraction as fallback
      }
    } else {
      console.warn('No image URLs provided. Using traditional text extraction only.');
    }

    // Validate that we have some content to analyze
    if ((!text || text.trim().length === 0) && (!imageAnalyses || imageAnalyses.length === 0)) {
      console.error('ERROR: No content extracted from PDF using any method.');
      return new Response(
        JSON.stringify({ 
          error: 'No content could be extracted from this PDF. Please ensure your PDF contains readable text or images.',
          analysisId 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!user?.id) {
      console.error('No authenticated user found. Auth header present:', !!authHeader);
      if (authError) {
        console.error('Authentication error details:', authError);
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed. Your session may have expired. Please log in again and try again.',
            details: authError.message 
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required. Please log in and try again.' 
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
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

    const pageRecords = pages.map((page, index) => {
      // Use Vision API extracted content if available, otherwise use traditional extraction
      let pageText = page.text || '';
      
      if (imageAnalyses && imageAnalyses[index]) {
        pageText = imageAnalyses[index].combinedContent || imageAnalyses[index].textContent || pageText;
      }
      
      console.log(`Preparing page ${page.pageNumber} record: ${pageText.length} characters`);
      
      return {
        analysis_id: analysisId,
        page_number: page.pageNumber,
        title: `Slide ${page.pageNumber}`,
        content: pageText,
        score: 0,
        image_url: imageUrls[index] || null,
        thumbnail_url: imageUrls[index] || null,
      };
    });

    console.log(`Inserting ${pageRecords.length} page records into database`);
    const { error: pagesError } = await supabase
      .from('analysis_pages')
      .insert(pageRecords);

    if (pagesError) {
      console.error('Failed to insert page records:', pagesError);
      console.error('Page records data:', JSON.stringify(pageRecords.map(p => ({ 
        page_number: p.page_number, 
        content_length: p.content?.length || 0 
      }))));
    } else {
      console.log('Successfully inserted page records');
    }

    let openAIAnalysis: OpenAIAnalysis;
    try {
      openAIAnalysis = await analyzeWithOpenAI(text, pageCount, imageAnalyses);
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

      // Group issues by page number and create per-slide feedback
      const issuesByPage: Record<number, Array<{ title: string; description: string; priority: string }>> = {};
      issueRecords.forEach(issue => {
        if (issue.page_number) {
          if (!issuesByPage[issue.page_number]) {
            issuesByPage[issue.page_number] = [];
          }
          issuesByPage[issue.page_number].push({
            title: issue.title,
            description: issue.description,
            priority: issue.priority
          });
        }
      });

      // Update pages with feedback and recommendations from issues
      for (const [pageNumStr, pageIssues] of Object.entries(issuesByPage)) {
        const pageNum = parseInt(pageNumStr);
        const highPriorityIssues = pageIssues.filter(i => i.priority === 'High');
        const mediumPriorityIssues = pageIssues.filter(i => i.priority === 'Medium');
        const lowPriorityIssues = pageIssues.filter(i => i.priority === 'Low');

        // Create detailed feedback from issues
        let feedback = '';
        if (highPriorityIssues.length > 0) {
          feedback += `CRITICAL ISSUES (High Priority):\n\n`;
          highPriorityIssues.forEach((issue, idx) => {
            feedback += `${idx + 1}. ${issue.title}\n${issue.description}\n\n`;
          });
        }
        if (mediumPriorityIssues.length > 0) {
          feedback += `IMPORTANT ISSUES (Medium Priority):\n\n`;
          mediumPriorityIssues.forEach((issue, idx) => {
            feedback += `${idx + 1}. ${issue.title}\n${issue.description}\n\n`;
          });
        }
        if (lowPriorityIssues.length > 0) {
          feedback += `IMPROVEMENTS (Low Priority):\n\n`;
          lowPriorityIssues.forEach((issue, idx) => {
            feedback += `${idx + 1}. ${issue.title}\n${issue.description}\n\n`;
          });
        }

        // Create recommendations array
        const recommendations = pageIssues
          .filter(i => i.priority === 'High' || i.priority === 'Medium')
          .map(i => i.description)
          .slice(0, 5); // Limit to top 5 recommendations

        if (feedback || recommendations.length > 0) {
          const { error: updatePageError } = await supabase
            .from('analysis_pages')
            .update({
              feedback: feedback.trim() || null,
              recommendations: recommendations.length > 0 ? recommendations : null,
            })
            .eq('analysis_id', analysisId)
            .eq('page_number', pageNum);

          if (updatePageError) {
            console.error(`Failed to update feedback for page ${pageNum}:`, updatePageError);
          } else {
            console.log(`Updated feedback for page ${pageNum}`);
          }
        }
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