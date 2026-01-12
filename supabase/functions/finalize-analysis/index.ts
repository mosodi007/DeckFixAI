import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Dynamic CORS headers
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

  try {
    // Parse request
    const body = await req.json();
    const { analysisId } = body;

    if (!analysisId) {
      return new Response(JSON.stringify({ error: 'Missing analysisId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Finalizing analysis ${analysisId}...`);

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

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return new Response(JSON.stringify({ error: 'Analysis not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all page contents
    const { data: pages, error: pagesError } = await supabase
      .from('analysis_pages')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('page_number', { ascending: true });

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return new Response(JSON.stringify({ error: `Error fetching pages: ${pagesError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${pages?.length || 0} pages for analysis ${analysisId}`);
    
    if (!pages || pages.length === 0) {
      // Update status to failed if no pages
      await supabase
        .from('analyses')
        .update({ 
          status: 'failed', 
          error_message: 'No pages were successfully analyzed' 
        })
        .eq('id', analysisId);
      
      return new Response(JSON.stringify({ error: 'No pages found for analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pages.length} pages to analyze`);

    // Build full text from all pages
    const pageTexts = pages.map(p => p.content || '');
    const pagesWithContent = pageTexts.filter(t => t && t.trim().length > 0);
    console.log(`Pages with content: ${pagesWithContent.length}/${pages.length}`);
    
    if (pagesWithContent.length === 0) {
      console.error('No pages have content!');
      await supabase
        .from('analyses')
        .update({ 
          status: 'failed', 
          error_message: 'No page content found for analysis' 
        })
        .eq('id', analysisId);
      return new Response(JSON.stringify({ error: 'No page content found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const fullText = pageTexts.map((t, i) => `--- Slide ${i + 1} ---\n${t || '[No content]'}`).join('\n\n');
    const pageCount = pages.length;
    console.log(`Full text length: ${fullText.length} characters`);

    // Generate comprehensive analysis
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
        'Authorization': `Bearer ${openAIKey}`,
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
      
      // Handle rate limits specifically
      if (response.status === 429) {
        console.error('Finalization rate limited by OpenAI API');
        throw new Error(`OpenAI API error: 429`);
      }
      
      // Only log non-rate-limit errors
      if (response.status !== 429) {
        console.error('Analysis error:', response.status, error.substring(0, 300));
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult: OpenAIAnalysis = JSON.parse(data.choices[0].message.content);

    // Update page records with scores and feedback
    if (analysisResult.pageAnalyses && analysisResult.pageAnalyses.length > 0) {
      for (const pageAnalysis of analysisResult.pageAnalyses) {
        await supabase
          .from('analysis_pages')
          .update({
            score: pageAnalysis.score || 0,
            feedback: pageAnalysis.feedback || '',
            title: pageAnalysis.title || `Slide ${pageAnalysis.pageNumber}`,
          })
          .eq('analysis_id', analysisId)
          .eq('page_number', pageAnalysis.pageNumber);
      }
    }

    // Insert issues
    if (analysisResult.issues?.length > 0) {
      const issueRecords = analysisResult.issues.map((issue, i) => ({
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

    // Update final analysis - only update columns that exist in the schema
    // Store additional data in the result jsonb column
    const updateData: any = {
      overall_score: analysisResult.overallScore || 0,
      summary: analysisResult.summary || '',
      overall_score_feedback: analysisResult.overallScoreFeedback || '',
      investment_grade_feedback: analysisResult.investmentGradeFeedback || '',
      funding_odds_feedback: analysisResult.fundingOddsFeedback || '',
      page_count_feedback: analysisResult.pageCountFeedback || '',
      word_density: analysisResult.wordDensityAssessment || 'Balanced', // Note: column is word_density, not word_density_assessment
      word_density_feedback: analysisResult.wordDensityFeedback || '',
      status: 'completed',
      // Store all additional analysis data in the result jsonb column
      result: {
        clarity_score: analysisResult.clarityScore || 0,
        design_score: analysisResult.designScore || 0,
        content_score: analysisResult.contentScore || 0,
        structure_score: analysisResult.structureScore || 0,
        strengths: analysisResult.strengths || [],
        weaknesses: analysisResult.weaknesses || [],
        deal_breakers: analysisResult.dealBreakers || [],
        red_flags: analysisResult.redFlags || [],
        stage_assessment: analysisResult.stageAssessment || null,
        investment_readiness: analysisResult.investmentReadiness || null,
        key_business_metrics: analysisResult.keyBusinessMetrics || null,
        page_analyses: analysisResult.pageAnalyses || [],
      }
    };

    const { error: updateError } = await supabase.from('analyses').update(updateData).eq('id', analysisId);

    if (updateError) {
      console.error('Failed to update analysis status:', updateError);
      throw new Error(`Failed to update analysis status: ${updateError.message}`);
    }

    // Verify the update succeeded
    const { data: verifyAnalysis, error: verifyError } = await supabase
      .from('analyses')
      .select('status')
      .eq('id', analysisId)
      .single();

    if (verifyError || verifyAnalysis?.status !== 'completed') {
      console.error('Status verification failed:', verifyError || 'Status not updated');
      // Try one more time
      await supabase.from('analyses').update({ status: 'completed' }).eq('id', analysisId);
    }

    // Create notification
    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'analysis_complete',
        title: 'Analysis Complete',
        message: `Your pitch deck "${analysis.file_name}" has been analyzed.`,
        data: { analysisId, fileName: analysis.file_name, score: analysisResult.overallScore },
      });
    } catch (e) {
      console.error('Notification error:', e);
    }

    console.log('Analysis finalized successfully!');
    return new Response(JSON.stringify({
      success: true,
      analysisId,
      overallScore: analysisResult.overallScore,
      pageCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error finalizing analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to finalize analysis',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

