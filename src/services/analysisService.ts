import { createClient } from '@supabase/supabase-js';
import { normalizeScoreTo0To10 } from '../utils/scoreUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'set' : 'missing',
    key: supabaseKey ? 'set' : 'missing'
  });
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

function getPublicImageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
  // If it's already a full URL, return it as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  // Otherwise, construct the public URL from storage path
  return `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
}

export interface AnalysisData {
  id: string;
  fileName: string;
  fileSize: number;
  overallScore: number;
  totalPages: number;
  summary: string;
  createdAt: string;
  slidesAnalyzedAt: string | null;
  fundingStage: string | null;
  investmentReady: boolean;
  wordDensity: string;
  disruptionSignal: number;
  overallScoreFeedback: string | null;
  investmentGradeFeedback: string | null;
  fundingOddsFeedback: string | null;
  wordDensityFeedback: string | null;
  disruptionSignalFeedback: string | null;
  pageCountFeedback: string | null;
  pages: Array<{
    pageNumber: number;
    title: string;
    score: number;
    content: string | null;
    feedback: string | null;
    recommendations: string[] | null;
    idealVersion: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
  }>;
  metrics: {
    clarityScore: number;
    designScore: number;
    contentScore: number;
    structureScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  keyMetrics: {
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
  stageAssessment: {
    detectedStage: string;
    stageConfidence: string;
    stageAppropriatenessScore: number;
    stageFeedback: string;
  } | null;
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
    teamFeedback?: string;
    marketOpportunityFeedback?: string;
    productFeedback?: string;
    tractionFeedback?: string;
    financialsFeedback?: string;
  } | null;
  redFlags: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    impact: string;
  }>;
  dealBreakers: Array<{
    id: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  issues: Array<{
    id: string;
    pageNumber: number | null;
    priority: string;
    title: string;
    description: string;
    type: 'issue' | 'improvement';
  }>;
  missingSlides: Array<{
    id: string;
    priority: string;
    title: string;
    description: string;
    suggestedContent: string;
  }>;
}

export async function analyzeDeck(
  file: File,
  analysisId: string,
  imageUrls: string[]
): Promise<{ analysisId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('analysisId', analysisId);
  formData.append('imageUrls', JSON.stringify(imageUrls));

  console.log('Uploading file:', file.name, 'Size:', file.size);
  console.log('Analysis ID:', analysisId);
  console.log('Image URLs:', imageUrls.length, 'slides');

  const headers: Record<string, string> = {
    'apikey': supabaseKey || '',
    'Accept': 'application/json',
  };

  console.log('API URL:', `${supabaseUrl}/functions/v1/analyze-deck`);
  console.log('API key present:', supabaseKey ? `Yes (${supabaseKey.substring(0, 20)}...)` : 'No - MISSING');

  // Get session and refresh if needed
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Check if session is expired or about to expire (within 2 minutes)
  let needsRefresh = false;
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Refresh if expired or expires within 2 minutes
    if (timeUntilExpiry < 120000) {
      needsRefresh = true;
      console.log(`Session ${timeUntilExpiry < 0 ? 'expired' : 'expiring soon'} (${Math.round(timeUntilExpiry / 1000)}s), refreshing...`);
    }
  } else if (!session) {
    // No session at all, try to refresh anyway (might have a refresh token)
    needsRefresh = true;
    console.log('No session found, attempting refresh...');
  }

  // Refresh session if needed
  if (needsRefresh) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        session = refreshData.session;
        console.log('Session refreshed successfully');
      } else {
        console.error('Failed to refresh session:', refreshError);
        // If refresh fails and we had no session, throw error
        if (!session) {
          throw new Error('No active session. Please log in and try again.');
        }
      }
    } catch (refreshErr: any) {
      console.error('Error refreshing session:', refreshErr);
      if (!session) {
        throw new Error('Session expired. Please log in and try again.');
      }
    }
  }

  if (!session?.access_token) {
    console.error('No valid session found. Session error:', sessionError);
    throw new Error('Authentication required. Please log in and try again.');
  }

  headers['Authorization'] = `Bearer ${session.access_token}`;
  console.log('Authorization header added, token length:', session.access_token.length);

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-deck`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );

  console.log('Response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to analyze deck';
    let requiresUpgrade = false;
    let currentBalance = 0;
    let requiredCredits = 0;
    let pageCount = 0;
    
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      console.error('Error from API:', error);
      
      // Check for insufficient credits (402 Payment Required)
      if (response.status === 402 && error.requiresUpgrade) {
        requiresUpgrade = true;
        currentBalance = error.currentBalance || 0;
        requiredCredits = error.requiredCredits || 0;
        pageCount = error.pageCount || 0;
        errorMessage = `Insufficient credits. You need ${requiredCredits} credits to analyze this ${pageCount}-page deck, but you currently have ${currentBalance} credits.`;
      } else if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in and try again.';
      }
    } catch (e) {
      const text = await response.text();
      console.error('Error response text:', text);
      errorMessage = text || errorMessage;
      
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in and try again.';
      }
    }
    
    // Create error with upgrade information
    const error = new Error(errorMessage) as Error & {
      requiresUpgrade?: boolean;
      currentBalance?: number;
      requiredCredits?: number;
      pageCount?: number;
    };
    
    if (requiresUpgrade) {
      error.requiresUpgrade = true;
      error.currentBalance = currentBalance;
      error.requiredCredits = requiredCredits;
      error.pageCount = pageCount;
    }
    
    throw error;
  }

  const result = await response.json();
  console.log('Analysis result:', result);
  return { analysisId: result.analysisId };
}

export async function getMostRecentAnalysis(): Promise<AnalysisData | null> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (analysisError) throw analysisError;
  if (!analysis) return null;

  return getAnalysis(analysis.id);
}

export async function migrateSessionAnalyses(fromUserIdOrSessionId: string, toUserId: string): Promise<void> {
  const { error: sessionMigrationError } = await supabase
    .from('analyses')
    .update({ user_id: toUserId, session_id: null })
    .eq('session_id', fromUserIdOrSessionId)
    .is('user_id', null);

  if (sessionMigrationError) {
    console.error('Failed to migrate session analyses:', sessionMigrationError);
  }

  const { error: userMigrationError } = await supabase
    .from('analyses')
    .update({ user_id: toUserId })
    .eq('user_id', fromUserIdOrSessionId);

  if (userMigrationError) {
    console.error('Failed to migrate user analyses:', userMigrationError);
  }

  console.log('Successfully migrated analyses to authenticated user');
}

/**
 * Checks the status of an analysis
 */
export async function getAnalysisStatus(analysisId: string): Promise<'pending' | 'processing' | 'completed' | 'failed' | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('status')
    .eq('id', analysisId)
    .single();

  if (error || !data) return null;
  return (data.status || 'completed') as 'pending' | 'processing' | 'completed' | 'failed';
}

export async function getAnalysis(analysisId: string): Promise<AnalysisData> {
  // Retry fetching analysis with status check (in case of race condition)
  let analysis: any = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const { data, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError) {
      if (attempts === maxAttempts - 1) throw analysisError;
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      continue;
    }

    analysis = data;
    const status = (analysis.status || 'completed') as 'pending' | 'processing' | 'completed' | 'failed';
    
    // If completed or failed, we're done
    if (status === 'completed' || status === 'failed') {
      break;
    }
    
    // If still processing, wait and retry
    if (status === 'pending' || status === 'processing') {
      if (attempts === maxAttempts - 1) {
        throw new Error(`Analysis is still ${status}. Please wait for it to complete.`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      continue;
    }
    
    break;
  }

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  // Check if analysis is complete
  const status = (analysis.status || 'completed') as 'pending' | 'processing' | 'completed' | 'failed';
  
  if (status === 'failed') {
    throw new Error(`Analysis failed. ${analysis.error_message || 'Please try uploading again.'}`);
  }

  const { data: pages, error: pagesError } = await supabase
    .from('analysis_pages')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('page_number');

  if (pagesError) throw pagesError;

  const { data: metrics, error: metricsError } = await supabase
    .from('analysis_metrics')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (metricsError) throw metricsError;

  const { data: issues, error: issuesError } = await supabase
    .from('analysis_issues')
    .select('*')
    .eq('analysis_id', analysisId);

  if (issuesError) throw issuesError;

  const { data: missingSlides, error: missingError } = await supabase
    .from('missing_slides')
    .select('*')
    .eq('analysis_id', analysisId);

  if (missingError) throw missingError;

  const { data: keyMetrics, error: keyMetricsError } = await supabase
    .from('key_business_metrics')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (keyMetricsError) throw keyMetricsError;

  const { data: stageAssessment, error: stageError } = await supabase
    .from('analysis_stage_assessment')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (stageError) throw stageError;

  const { data: investmentReadiness, error: readinessError } = await supabase
    .from('analysis_investment_readiness')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (readinessError) throw readinessError;

  const { data: redFlags, error: redFlagsError } = await supabase
    .from('analysis_red_flags')
    .select('*')
    .eq('analysis_id', analysisId);

  if (redFlagsError) throw redFlagsError;

  const { data: dealBreakers, error: dealBreakersError } = await supabase
    .from('analysis_deal_breakers')
    .select('*')
    .eq('analysis_id', analysisId);

  if (dealBreakersError) throw dealBreakersError;

  // Extract data from result jsonb column (where we store detailed analysis)
  const resultData = analysis.result || {};
  
  // Derive investment grade from overall score
  const getInvestmentGrade = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  };
  
  // Derive funding odds from investment readiness or overall score
  const getFundingOdds = (readiness: any, score: number): 'Very High' | 'High' | 'Low' | 'Very Low' => {
    if (readiness?.readinessScore >= 80 || score >= 85) return 'Very High';
    if (readiness?.readinessScore >= 65 || score >= 70) return 'High';
    if (readiness?.readinessScore >= 50 || score >= 55) return 'Low';
    return 'Very Low';
  };
  
  // Calculate critical issues count - include all issues that need attention
  // Count: deal breakers + all red flags (not just critical) + all high/medium priority issues
  const criticalIssuesCount = (dealBreakers?.length || 0) + 
    (redFlags?.length || 0) + // Count all red flags, not just critical
    (issues?.filter((i: any) => i.priority === 'High' || i.priority === 'Medium').length || 0) +
    (missingSlides?.length || 0); // Also count missing slides as issues

  // Normalize score to 0-10 scale using unified utility
  const overallScore = normalizeScoreTo0To10(analysis.overall_score);

  return {
    id: analysis.id,
    fileName: analysis.file_name,
    fileSize: analysis.file_size,
    overallScore,
    totalPages: analysis.total_pages,
    summary: analysis.summary,
    businessSummary: analysis.summary, // Use summary as business summary
    createdAt: analysis.created_at,
    slidesAnalyzedAt: analysis.slides_analyzed_at || null,
    fundingStage: analysis.funding_stage,
    investmentReady: analysis.investment_ready || false,
    wordDensity: analysis.word_density || 'Not analyzed',
    disruptionSignal: analysis.disruption_signal || 0,
    overallScoreFeedback: analysis.overall_score_feedback || null,
    investmentGrade: getInvestmentGrade(analysis.overall_score),
    investmentGradeFeedback: analysis.investment_grade_feedback || null,
    fundingOdds: getFundingOdds(investmentReadiness, analysis.overall_score),
    fundingOddsFeedback: analysis.funding_odds_feedback || null,
    wordDensityFeedback: analysis.word_density_feedback || null,
    disruptionSignalFeedback: analysis.disruption_signal_feedback || null,
    pageCountFeedback: analysis.page_count_feedback || null,
    criticalIssuesCount,
    criticalIssuesFeedback: criticalIssuesCount > 0 
      ? `Found ${criticalIssuesCount} critical issue${criticalIssuesCount > 1 ? 's' : ''} that need immediate attention. ${dealBreakers?.length ? `${dealBreakers.length} deal-breaker${dealBreakers.length > 1 ? 's' : ''} and ` : ''}${redFlags?.filter((f: any) => f.severity === 'critical').length || 0} critical red flag${(redFlags?.filter((f: any) => f.severity === 'critical').length || 0) > 1 ? 's' : ''}.`
      : null,
    pages: pages?.map((p: any) => ({
      page_number: p.page_number, // Keep snake_case for compatibility
      pageNumber: p.page_number, // Also provide camelCase
      title: p.title,
      score: p.score,
      content: p.content || '',
      feedback: p.feedback || p.brutal_feedback || p.critical_feedback || null,
      recommendations: (() => {
        if (!p.recommendations) return [];
        if (Array.isArray(p.recommendations)) return p.recommendations;
        if (typeof p.recommendations === 'string') {
          try {
            return JSON.parse(p.recommendations);
          } catch {
            return [p.recommendations];
          }
        }
        return [];
      })(),
      idealVersion: p.ideal_version,
      imageUrl: getPublicImageUrl(p.image_url),
      thumbnailUrl: getPublicImageUrl(p.thumbnail_url),
      image_url: getPublicImageUrl(p.image_url), // Also provide snake_case
      thumbnail_url: getPublicImageUrl(p.thumbnail_url), // Also provide snake_case
    })) || [],
    metrics: {
      // Get from result jsonb first, fallback to metrics table
      clarityScore: resultData.clarity_score || metrics?.clarity_score || 0,
      designScore: resultData.design_score || metrics?.design_score || 0,
      contentScore: resultData.content_score || metrics?.content_score || 0,
      structureScore: resultData.structure_score || metrics?.structure_score || 0,
      strengths: resultData.strengths || metrics?.strengths || [],
      weaknesses: resultData.weaknesses || metrics?.weaknesses || [],
    },
    keyMetrics: {
      // Get from result jsonb first, fallback to key_business_metrics table
      companyName: resultData.key_business_metrics?.companyName || keyMetrics?.company_name || 'Not specified',
      industry: resultData.key_business_metrics?.industry || keyMetrics?.industry || 'Not specified',
      currentRevenue: resultData.key_business_metrics?.currentRevenue || keyMetrics?.current_revenue || 'Not specified',
      fundingSought: resultData.key_business_metrics?.fundingSought || keyMetrics?.funding_sought || 'Not specified',
      growthRate: resultData.key_business_metrics?.growthRate || keyMetrics?.growth_rate || 'Not specified',
      teamSize: resultData.key_business_metrics?.teamSize || keyMetrics?.team_size || 0,
      marketSize: resultData.key_business_metrics?.marketSize || keyMetrics?.market_size || 'Not specified',
      valuation: resultData.key_business_metrics?.valuation || keyMetrics?.valuation || 'Not specified',
      businessModel: resultData.key_business_metrics?.businessModel || keyMetrics?.business_model || 'Not specified',
      customerCount: resultData.key_business_metrics?.customerCount || keyMetrics?.customer_count || 'Not specified',
    },
    stageAssessment: resultData.stageAssessment || (stageAssessment ? {
      detectedStage: stageAssessment.detected_stage,
      stageConfidence: stageAssessment.stage_confidence,
      stageAppropriatenessScore: stageAssessment.stage_appropriateness_score,
      stageFeedback: stageAssessment.stage_specific_feedback,
    } : null),
    investmentReadiness: resultData.investmentReadiness || (investmentReadiness ? {
      isInvestmentReady: investmentReadiness.is_investment_ready,
      readinessScore: investmentReadiness.readiness_score,
      readinessSummary: investmentReadiness.readiness_summary,
      criticalBlockers: investmentReadiness.critical_blockers || [],
      teamScore: investmentReadiness.team_score,
      marketOpportunityScore: investmentReadiness.market_opportunity_score,
      productScore: investmentReadiness.product_score,
      tractionScore: investmentReadiness.traction_score,
      financialsScore: investmentReadiness.financials_score,
      teamFeedback: investmentReadiness.team_feedback,
      marketOpportunityFeedback: investmentReadiness.market_opportunity_feedback,
      productFeedback: investmentReadiness.product_feedback,
      tractionFeedback: investmentReadiness.traction_feedback,
      financialsFeedback: investmentReadiness.financials_feedback,
    } : null),
    // Get from result jsonb first, fallback to database tables
    redFlags: (resultData.red_flags || redFlags || []).map((f: any) => ({
      id: f.id || `redflag-${f.title}`,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
    })),
    dealBreakers: (resultData.deal_breakers || dealBreakers || []).map((b: any) => ({
      id: b.id || `dealbreaker-${b.title}`,
      title: b.title,
      description: b.description,
      recommendation: b.recommendation,
    })),
    issues: issues?.map((i: any) => ({
      id: i.id,
      pageNumber: i.page_number,
      priority: i.priority,
      title: i.title,
      description: i.description,
      type: i.type,
    })) || [],
    missingSlides: missingSlides?.map((s: any) => ({
      id: s.id,
      priority: s.priority,
      title: s.title,
      description: s.description,
      suggestedContent: s.suggested_content,
    })) || [],
  };
}
