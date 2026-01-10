import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

function getPublicImageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null;
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
  // Don't send images during initial analysis - only text analysis for speed and reliability
  // Images will be used later for detailed improvement suggestions

  console.log('Uploading file:', file.name, 'Size:', file.size);
  console.log('Analysis ID:', analysisId);
  console.log('Image URLs stored:', imageUrls.length, '(not sent to AI during initial analysis)');

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-deck`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: formData,
    }
  );

  console.log('Response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to analyze deck';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      console.error('Error from API:', error);
    } catch (e) {
      const text = await response.text();
      console.error('Error response text:', text);
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
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

export async function getAnalysis(analysisId: string): Promise<AnalysisData> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (analysisError) throw analysisError;

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

  return {
    id: analysis.id,
    fileName: analysis.file_name,
    fileSize: analysis.file_size,
    overallScore: analysis.overall_score,
    totalPages: analysis.total_pages,
    summary: analysis.summary,
    createdAt: analysis.created_at,
    fundingStage: analysis.funding_stage,
    investmentReady: analysis.investment_ready || false,
    wordDensity: analysis.word_density || 'Not analyzed',
    disruptionSignal: analysis.disruption_signal || 0,
    overallScoreFeedback: analysis.overall_score_feedback || null,
    investmentGradeFeedback: analysis.investment_grade_feedback || null,
    fundingOddsFeedback: analysis.funding_odds_feedback || null,
    wordDensityFeedback: analysis.word_density_feedback || null,
    disruptionSignalFeedback: analysis.disruption_signal_feedback || null,
    pageCountFeedback: analysis.page_count_feedback || null,
    pages: pages?.map((p: any) => ({
      pageNumber: p.page_number,
      title: p.title,
      score: p.score,
      content: p.content,
      feedback: p.feedback,
      recommendations: p.recommendations,
      idealVersion: p.ideal_version,
      imageUrl: getPublicImageUrl(p.image_url),
      thumbnailUrl: getPublicImageUrl(p.thumbnail_url),
    })) || [],
    metrics: {
      clarityScore: metrics?.clarity_score || 0,
      designScore: metrics?.design_score || 0,
      contentScore: metrics?.content_score || 0,
      structureScore: metrics?.structure_score || 0,
      strengths: metrics?.strengths || [],
      weaknesses: metrics?.weaknesses || [],
    },
    keyMetrics: {
      companyName: keyMetrics?.company_name || 'Not specified',
      industry: keyMetrics?.industry || 'Not specified',
      currentRevenue: keyMetrics?.current_revenue || 'Not specified',
      fundingSought: keyMetrics?.funding_sought || 'Not specified',
      growthRate: keyMetrics?.growth_rate || 'Not specified',
      teamSize: keyMetrics?.team_size || 0,
      marketSize: keyMetrics?.market_size || 'Not specified',
      valuation: keyMetrics?.valuation || 'Not specified',
      businessModel: keyMetrics?.business_model || 'Not specified',
      customerCount: keyMetrics?.customer_count || 'Not specified',
    },
    stageAssessment: stageAssessment ? {
      detectedStage: stageAssessment.detected_stage,
      stageConfidence: stageAssessment.stage_confidence,
      stageAppropriatenessScore: stageAssessment.stage_appropriateness_score,
      stageFeedback: stageAssessment.stage_specific_feedback,
    } : null,
    investmentReadiness: investmentReadiness ? {
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
    } : null,
    redFlags: redFlags?.map((f: any) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      impact: f.impact,
    })) || [],
    dealBreakers: dealBreakers?.map((b: any) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      recommendation: b.recommendation,
    })) || [],
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
