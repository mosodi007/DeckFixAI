import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Dynamic CORS headers based on request origin
function getAllowedOrigin(origin: string | null): string {
  const allowedOrigins = [
    'https://deckfix.ai',
    'https://www.deckfix.ai',
  ];
  if (origin && (allowedOrigins.includes(origin) || origin.includes('localhost'))) {
    return origin;
  }
  return 'https://deckfix.ai';
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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
  wordDensityAssessment: 'Too Dense' | 'Balanced' | 'Too Sparse';
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
    category: string;
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
  pageAnalyses?: Array<{
    pageNumber: number;
    title: string;
    content: string;
    score: number;
    feedback: string;
  }>;
}

// Credit management
async function checkSufficientCredits(supabase: any, userId: string, cost: number) {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credits_balance')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(`Failed to check credits: ${error.message}`);
  return { sufficient: data.credits_balance >= cost, currentBalance: data.credits_balance };
}

async function deductCredits(supabase: any, userId: string, amount: number, desc: string, meta: any) {
  const { error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: desc,
    p_metadata: meta,
  });
  if (error) throw new Error(`Failed to deduct credits: ${error.message}`);
}

async function refundCredits(supabase: any, userId: string, amount: number, analysisId: string) {
  const { error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: `Refund for failed analysis`,
    p_metadata: { analysisId, type: 'refund' },
  });
  if (error) console.error('Refund failed:', error);
}

// Step 1: Extract text from images in batches
async function extractTextFromImages(imageUrls: string[], apiKey: string): Promise<string[]> {
  const BATCH_SIZE = 5;
  const results: string[] = [];
  
  for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
    const batch = imageUrls.slice(i, Math.min(i + BATCH_SIZE, imageUrls.length));
    const startPage = i + 1;
    console.log(`Extracting text from pages ${startPage}-${startPage + batch.length - 1}...`);
    
    const imageContent = batch.map((url) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'low' as const }
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Extract ALL text from these ${batch.length} slides. Return JSON array: ["page 1 text", "page 2 text", ...]` },
            ...imageContent
          ]
        }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, response.status);
      for (let j = 0; j < batch.length; j++) results.push('');
      continue;
    }

    const data = await response.json();
    try {
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      const texts = Array.isArray(parsed) ? parsed : (parsed.pages || parsed.slides || Object.values(parsed));
      texts.forEach((t: string) => results.push(t || ''));
    } catch {
      for (let j = 0; j < batch.length; j++) results.push('');
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < imageUrls.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return results;
}

// Step 2: Analyze extracted text
async function analyzeText(pageTexts: string[], apiKey: string): Promise<OpenAIAnalysis> {
  const pageCount = pageTexts.length;
  const fullText = pageTexts.map((t, i) => `--- Slide ${i + 1} ---\n${t}`).join('\n\n');
  
  console.log(`Analyzing ${pageCount} pages of extracted text...`);

  const systemPrompt = `You are an elite VC analyst. Analyze this pitch deck and provide brutally honest feedback.
Return ONLY valid JSON:
{
  "overallScore": <0-100>,
  "summary": "<100+ words>",
  "clarityScore": <0-100>,
  "designScore": <0-100>,
  "contentScore": <0-100>,
  "structureScore": <0-100>,
  "overallScoreFeedback": "<200+ words>",
  "investmentGradeFeedback": "<150+ words>",
  "fundingOddsFeedback": "<150+ words>",
  "pageCountFeedback": "<80+ words>",
  "wordDensityAssessment": "Too Dense"|"Balanced"|"Too Sparse",
  "wordDensityFeedback": "<80+ words>",
  "strengths": ["<40+ words each>"],
  "weaknesses": ["<40+ words each>"],
  "issues": [{"pageNumber": <1-N or null>, "priority": "High"|"Medium"|"Low", "title": "<specific>", "description": "<80+ words>", "type": "issue"|"improvement"}],
  "dealBreakers": [{"title": "<>", "description": "<100+ words>", "recommendation": "<80+ words>"}],
  "redFlags": [{"category": "<>", "severity": "critical"|"major"|"moderate", "title": "<>", "description": "<100+ words>", "impact": "<80+ words>"}],
  "stageAssessment": {"detectedStage": "<>", "stageConfidence": "high"|"medium"|"low", "stageAppropriatenessScore": <0-100>, "stageFeedback": "<150+ words>"},
  "investmentReadiness": {"isInvestmentReady": <bool>, "readinessScore": <0-100>, "readinessSummary": "<200+ words>", "criticalBlockers": [], "teamScore": <0-100>, "marketOpportunityScore": <0-100>, "productScore": <0-100>, "tractionScore": <0-100>, "financialsScore": <0-100>, "teamFeedback": "<150+ words>", "marketOpportunityFeedback": "<150+ words>", "productFeedback": "<150+ words>", "tractionFeedback": "<150+ words>", "financialsFeedback": "<150+ words>"},
  "keyBusinessMetrics": {"companyName": "<>", "industry": "<>", "currentRevenue": "<>", "fundingSought": "<>", "growthRate": "<>", "teamSize": <num>, "marketSize": "<>", "valuation": "<>", "businessModel": "<>", "customerCount": "<>"},
  "pageAnalyses": [{"pageNumber": <1-N>, "title": "<>", "content": "<extracted>", "score": <0-100>, "feedback": "<80+ words>"}]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this ${pageCount}-slide pitch deck:\n\n${fullText}` }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Analysis error:', response.status, error.substring(0, 300));
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Combined analysis function
async function analyzeWithVision(imageUrls: string[], apiKey: string): Promise<OpenAIAnalysis> {
  console.log(`Starting 2-step analysis for ${imageUrls.length} slides...`);
  
  // Step 1: Extract text from images in batches
  const startExtract = Date.now();
  const pageTexts = await extractTextFromImages(imageUrls, apiKey);
  console.log(`Text extraction completed in ${Math.round((Date.now() - startExtract) / 1000)}s`);
  
  // Step 2: Analyze the extracted text
  const startAnalysis = Date.now();
  const analysis = await analyzeText(pageTexts, apiKey);
  console.log(`Text analysis completed in ${Math.round((Date.now() - startAnalysis) / 1000)}s`);
  
  // Enrich pageAnalyses with extracted text
  if (!analysis.pageAnalyses || analysis.pageAnalyses.length === 0) {
    analysis.pageAnalyses = pageTexts.map((text, i) => ({
      pageNumber: i + 1,
      title: `Slide ${i + 1}`,
      content: text,
      score: analysis.overallScore || 0,
      feedback: ''
    }));
  } else {
    analysis.pageAnalyses.forEach((p, i) => {
      if (!p.content && pageTexts[i]) p.content = pageTexts[i];
    });
  }
  
  return analysis;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIKey = Deno.env.get('OPENAI_API_KEY');

  if (!openAIKey || !openAIKey.startsWith('sk-')) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let userId: string | null = null;
  let creditCost = 0;
  let analysisId: string | null = null;

  try {
    // Parse request body
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let body: any;
    try {
      const rawBody = await req.text();
      console.log('Raw body length:', rawBody.length);
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body');
      }
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      return new Response(JSON.stringify({ error: `Invalid JSON: ${parseError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { imageUrls, fileName, fileSize, analysisId: reqAnalysisId } = body;
    analysisId = reqAnalysisId;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'No image URLs provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pageCount = imageUrls.length;
    console.log(`Starting analysis: ${pageCount} pages, ${fileName}`);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user?.id || authError) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    userId = user.id;

    // Credit check
    creditCost = pageCount;
    const creditCheck = await checkSufficientCredits(supabase, userId, creditCost);
    if (!creditCheck.sufficient) {
      return new Response(JSON.stringify({
        error: 'Insufficient credits',
        requiresUpgrade: true,
        currentBalance: creditCheck.currentBalance,
        requiredCredits: creditCost,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct credits upfront
    await deductCredits(supabase, userId, creditCost, `Analysis: ${fileName} (${pageCount} pages)`, { analysisId, pageCount, fileName });

    // Update analysis status
    await supabase.from('analyses').update({ status: 'processing', file_name: fileName, file_size: fileSize, total_pages: pageCount }).eq('id', analysisId);

    // SINGLE API CALL - analyze all images
    console.log('Calling Vision API with all images...');
    const startTime = Date.now();
    
    let analysis: OpenAIAnalysis;
    try {
      analysis = await analyzeWithVision(imageUrls, openAIKey);
      console.log(`Analysis completed in ${Math.round((Date.now() - startTime) / 1000)}s`);
    } catch (aiError: any) {
      await refundCredits(supabase, userId, creditCost, analysisId!);
      throw new Error(`AI analysis failed: ${aiError.message}`);
    }

    // Insert page records
    const pageRecords = (analysis.pageAnalyses || []).map((p, i) => ({
      analysis_id: analysisId,
      page_number: p.pageNumber || i + 1,
      title: p.title || `Slide ${i + 1}`,
      content: p.content || '',
      score: p.score || 0,
      feedback: p.feedback || '',
      image_url: imageUrls[i] || null,
      thumbnail_url: imageUrls[i] || null,
    }));

    // If no pageAnalyses, create basic records
    if (pageRecords.length === 0) {
      for (let i = 0; i < pageCount; i++) {
        pageRecords.push({
          analysis_id: analysisId,
          page_number: i + 1,
          title: `Slide ${i + 1}`,
          content: '',
          score: analysis.overallScore || 0,
          feedback: '',
          image_url: imageUrls[i] || null,
          thumbnail_url: imageUrls[i] || null,
        });
      }
    }

    await supabase.from('analysis_pages').insert(pageRecords);

    // Insert issues
    if (analysis.issues?.length > 0) {
      const issueRecords = analysis.issues.map((issue, i) => ({
        analysis_id: analysisId,
        page_number: issue.pageNumber,
        priority: issue.priority,
        title: issue.title,
        description: issue.description,
        type: issue.type || 'issue',
        order_index: i,
      }));
      await supabase.from('analysis_issues').insert(issueRecords);
    }

    // Update final analysis
    await supabase.from('analyses').update({
      overall_score: analysis.overallScore || 0,
      summary: analysis.summary || '',
      overall_score_feedback: analysis.overallScoreFeedback || '',
      investment_grade_feedback: analysis.investmentGradeFeedback || '',
      funding_odds_feedback: analysis.fundingOddsFeedback || '',
      page_count_feedback: analysis.pageCountFeedback || '',
      word_density_assessment: analysis.wordDensityAssessment || 'Balanced',
      word_density_feedback: analysis.wordDensityFeedback || '',
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      clarity_score: analysis.clarityScore || 0,
      design_score: analysis.designScore || 0,
      content_score: analysis.contentScore || 0,
      structure_score: analysis.structureScore || 0,
      deal_breakers: analysis.dealBreakers || [],
      red_flags: analysis.redFlags || [],
      stage_assessment: analysis.stageAssessment || null,
      investment_readiness: analysis.investmentReadiness || null,
      key_business_metrics: analysis.keyBusinessMetrics || null,
      status: 'completed',
    }).eq('id', analysisId);

    // Create notification
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'analysis_complete',
        title: 'Analysis Complete',
        message: `Your pitch deck "${fileName}" has been analyzed.`,
        data: { analysisId, fileName, score: analysis.overallScore },
      });
    } catch (e) {
      console.error('Notification error:', e);
    }

    console.log('Analysis complete!');
    return new Response(JSON.stringify({
      success: true,
      analysisId,
      overallScore: analysis.overallScore,
      pageCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);

    // Refund on failure
    if (userId && creditCost > 0 && analysisId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await refundCredits(supabase, userId, creditCost, analysisId);
      await supabase.from('analyses').update({ status: 'failed', error_message: error.message }).eq('id', analysisId);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
