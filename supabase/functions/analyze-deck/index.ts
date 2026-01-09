import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractTextFromPDF, extractPageImages } from './pdfExtractor.ts';

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

    const prompt = `You are a seasoned venture capital partner with 20+ years of experience evaluating pitch decks. You've seen thousands of decks and funded 100+ companies. You are brutally honest and focus on what actually matters for funding decisions. Analyze this ${pageCount}-page pitch deck with the critical eye of someone who writes checks.

## DECK CONTENT:
${textToAnalyze}

## ANALYSIS INSTRUCTIONS:

Provide a comprehensive, brutally honest analysis in strict JSON format. Be specific and direct about weaknesses and red flags.

### STEP 1: DETECT FUNDING STAGE

Based on the content, determine the funding stage:
- **Pre-Seed**: Idea stage, no/minimal revenue, early prototype
- **Seed**: MVP built, early traction, <$100K ARR, need product-market fit
- **Series A**: Proven product-market fit, $1M+ ARR, scaling playbook needed
- **Series B+**: Significant revenue ($10M+ ARR), proven unit economics, market expansion

Provide: detected_stage, stage_confidence (high/medium/low), stage_appropriateness_score (0-100)

### STEP 2: INVESTMENT READINESS ASSESSMENT

Evaluate five critical dimensions that VCs actually care about:

**Team Score (0-100):**
VCs invest in teams first. Assess:
- Founder backgrounds and domain expertise
- Track record of execution
- Completeness of founding team (technical + business)
- Advisory board quality
- Team slide presence and credibility signals
- Skin in the game / commitment level

**Market Opportunity Score (0-100):**
Is the market big enough and accessible?
- TAM/SAM/SOM clarity and credibility
- Market growth rate and tailwinds
- Timing - why now?
- Market positioning vs. competitors
- Realistic entry strategy
- Evidence of market demand

**Product Score (0-100):**
Does the solution actually solve a real problem?
- Problem-solution fit clarity
- Unique value proposition strength
- Technical differentiation/moat
- Product demo or screenshots
- Scalability of solution
- Proprietary advantages

**Traction Score (0-100):**
Show me the metrics that matter:
- Revenue/ARR if applicable
- User growth and engagement
- Key partnerships or customers
- Unit economics (CAC, LTV, margins)
- Retention/churn data
- Pipeline and conversion rates

**Financials Score (0-100):**
Are the projections realistic?
- Financial model presence and quality
- Burn rate and runway
- Path to profitability
- Use of funds clarity
- Valuation reasonableness
- Revenue assumptions credibility

Calculate **Readiness Score** as average of these 5 scores.
Set **is_investment_ready** = true only if readiness_score >= 70 AND no critical deal-breakers exist.

### STEP 3: IDENTIFY RED FLAGS

Be ruthlessly honest. Common red flags:
- **Team**: Solo founder, no relevant experience, weak/missing team
- **Financial**: Unrealistic projections, unclear use of funds, no mention of burn rate
- **Market**: Small/declining market, no clear customer segment, "everyone is our customer"
- **Product**: No clear differentiation, copycat product, no moat
- **Competition**: Claims "no competition", underestimates incumbents
- **Traction**: No metrics, vanity metrics only, no revenue path

For each red flag provide:
- category: 'financial' | 'team' | 'market' | 'product' | 'competition' | 'traction' | 'other'
- severity: 'critical' | 'major' | 'moderate'
- title: Brief name
- description: What's wrong
- impact: How this affects funding prospects

### STEP 4: IDENTIFY DEAL-BREAKERS

Be brutally direct. Deal-breakers are issues that make this deck uninvestable right now:
- Missing financials entirely
- No clear ask (how much money, what for)
- Fundamentally flawed business model
- No evidence of customer demand
- Missing critical team members
- Unrealistic market assumptions

For each deal-breaker:
- title: What's missing/wrong
- description: Why this is a deal-breaker
- recommendation: What must be fixed before approaching investors

### STEP 5: STAGE-SPECIFIC FEEDBACK

Based on detected stage, provide specific guidance:
- What's expected at this stage that's missing
- What's appropriate vs. premature for this stage
- How to better position for this stage's investors
- Red flags specific to this stage

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
For EACH page in the deck (1 to ${pageCount}), provide:
- pageNumber: actual page number
- title: page heading or inferred topic
- score: individual page quality (0-100)
- content: brief summary of page content

### IDENTIFY ISSUES:
List specific problems found (diagnostic):
- pageNumber: which page has the issue (or null if deck-wide)
- priority: "high", "medium", or "low"
- title: brief issue name
- description: what's wrong and why it matters

### SUGGEST IMPROVEMENTS:
CRITICAL: Provide at least 5-10 actionable improvement recommendations. These should be specific next steps the founder can take:
- pageNumber: which page to improve (or null if deck-wide)
- priority: "high", "medium", or "low" (prioritize high-impact changes)
- title: action-oriented title (e.g., "Add financial projections", "Strengthen team credentials")
- description: specific, actionable steps to take (e.g., "Include 3-year revenue forecast with key assumptions clearly stated")

Focus improvements on:
- What to add (missing content)
- What to clarify (unclear messaging)
- What to strengthen (weak areas)
- What to quantify (add metrics/data)
- What to restructure (reorder/reorganize)

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

### BUSINESS SUMMARY:
Write a comprehensive business summary (150-200 words) that reads like VC partner notes after reviewing the deck. Include:
- The core problem and solution
- Key traction metrics and concerns
- Team assessment (note if missing or weak)
- Investment readiness verdict (be direct: "Not ready for investors" if applicable)
- Critical gaps that must be addressed
- Brutally honest bottom-line recommendation

Don't sugarcoat issues. This is internal VC notes, not founder feedback.

## REQUIRED JSON FORMAT:

{
  "overallScore": <number 0-100>,
  "totalPages": ${pageCount},
  "summary": "<comprehensive business summary, 150-200 words, brutally honest>",
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
    {"pageNumber": 1, "title": "<title>", "score": <0-100>, "content": "<brief summary>"},
    ...
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
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", ...],
  "issues": [
    {"pageNumber": <number or null>, "priority": "high|medium|low", "title": "<title>", "description": "<details>"},
    ...
  ],
  "improvements": [
    {"pageNumber": <number or null>, "priority": "high|medium|low", "title": "<action-oriented title>", "description": "<specific actionable steps>"},
    ...at least 5-10 improvements required
  ],
  "missingSlides": [
    {"priority": "high|medium|low", "title": "<slide name>", "description": "<why needed>", "suggestedContent": "<what to include>"},
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
    console.log('Key Metrics:', analysis.keyMetrics);

    const { data: analysisRecord, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        file_name: file.name,
        file_size: file.size,
        overall_score: analysis.overallScore,
        total_pages: analysis.totalPages,
        summary: analysis.summary,
        funding_stage: analysis.stageAssessment?.detectedStage || null,
        investment_ready: analysis.investmentReadiness?.isInvestmentReady || false,
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error creating analysis:', analysisError);
      throw new Error(`Database error: ${analysisError.message}`);
    }

    const analysisId = analysisRecord.id;
    console.log('Analysis created with ID:', analysisId);

    console.log('Extracting page images...');
    let pageImages: Map<number, { imageUrl: string; thumbnailUrl: string }> = new Map();

    try {
      const { images } = await extractPageImages(arrayBuffer, pageCount);

      if (images && images.length > 0) {
        console.log(`Uploading ${images.length} slide images to storage...`);

        for (const image of images) {
          try {
            const fileName = `${analysisId}/slide-${image.pageNumber}.png`;

            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from('slide-images')
              .upload(fileName, image.imageData, {
                contentType: 'image/png',
                upsert: true
              });

            if (uploadError) {
              console.error(`Failed to upload image for page ${image.pageNumber}:`, uploadError);
              continue;
            }

            const { data: { publicUrl } } = supabase
              .storage
              .from('slide-images')
              .getPublicUrl(fileName);

            pageImages.set(image.pageNumber, {
              imageUrl: publicUrl,
              thumbnailUrl: publicUrl
            });

            console.log(`✓ Uploaded slide ${image.pageNumber}`);
          } catch (imgError) {
            console.error(`Error processing image for page ${image.pageNumber}:`, imgError);
          }
        }

        console.log(`Successfully uploaded ${pageImages.size} slide images`);
      }
    } catch (imageError) {
      console.warn('Could not extract page images, continuing without images:', imageError);
    }

    if (analysis.pages && analysis.pages.length > 0) {
      const pagesData = analysis.pages.map((page: any) => {
        const imageData = pageImages.get(page.pageNumber);
        return {
          analysis_id: analysisId,
          page_number: page.pageNumber,
          title: page.title,
          score: page.score,
          content: page.content || null,
          image_url: imageData?.imageUrl || null,
          thumbnail_url: imageData?.thumbnailUrl || null,
        };
      });
      console.log(`Inserting ${pagesData.length} pages with images`);
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