import { AnalysisData } from '../services/analysisService';

export function adaptAnalysisData(data: AnalysisData) {
  return {
    fileName: data.fileName,
    uploadDate: data.createdAt,
    overallScore: data.overallScore / 10,
    investmentGrade: getInvestmentGrade(data.overallScore),
    fundingOdds: getFundingOdds(data.investmentReadiness?.readinessScore || data.overallScore),
    investmentReady: data.investmentReady,
    fundingStage: data.fundingStage,
    businessSummary: data.summary,
    keyMetrics: {
      company: data.keyMetrics.companyName,
      industry: data.keyMetrics.industry,
      currentRevenue: data.keyMetrics.currentRevenue,
      fundingSought: data.keyMetrics.fundingSought,
      growthRate: data.keyMetrics.growthRate,
      teamSize: data.keyMetrics.teamSize,
      marketSize: data.keyMetrics.marketSize,
      valuation: data.keyMetrics.valuation,
      businessModel: data.keyMetrics.businessModel,
      customerCount: data.keyMetrics.customerCount
    },
    stageAssessment: data.stageAssessment ? {
      detectedStage: data.stageAssessment.detectedStage,
      stageConfidence: data.stageAssessment.stageConfidence,
      stageAppropriatenessScore: data.stageAssessment.stageAppropriatenessScore / 10,
      stageFeedback: data.stageAssessment.stageFeedback
    } : null,
    investmentReadiness: data.investmentReadiness ? {
      isInvestmentReady: data.investmentReadiness.isInvestmentReady,
      readinessScore: data.investmentReadiness.readinessScore / 10,
      readinessSummary: data.investmentReadiness.readinessSummary,
      criticalBlockers: data.investmentReadiness.criticalBlockers,
      scores: {
        team: data.investmentReadiness.teamScore / 10,
        marketOpportunity: data.investmentReadiness.marketOpportunityScore / 10,
        product: data.investmentReadiness.productScore / 10,
        traction: data.investmentReadiness.tractionScore / 10,
        financials: data.investmentReadiness.financialsScore / 10
      }
    } : null,
    redFlags: data.redFlags.map(f => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      impact: f.impact
    })),
    dealBreakers: data.dealBreakers.map(b => ({
      title: b.title,
      description: b.description,
      recommendation: b.recommendation
    })),
    metrics: {
      contentScore: data.metrics.contentScore / 10,
      clarityScore: data.metrics.clarityScore / 10,
      structureScore: data.metrics.structureScore / 10,
      designScore: data.metrics.designScore / 10
    },
    strengths: data.metrics.strengths,
    issues: data.metrics.weaknesses,
    improvements: (() => {
      const improvements = data.issues
        .filter(i => i.type === 'improvement')
        .map(i => ({
          priority: i.priority,
          issue: i.title,
          impact: i.description,
          pageNumber: i.pageNumber || 1
        }));

      if (improvements.length === 0 && data.metrics.weaknesses.length > 0) {
        return data.metrics.weaknesses.slice(0, 5).map((weakness, index) => ({
          priority: index < 2 ? 'high' : 'medium',
          issue: `Address: ${weakness.split(':')[0] || weakness.substring(0, 50)}`,
          impact: weakness,
          pageNumber: null
        }));
      }

      return improvements;
    })(),
    missingSlides: data.missingSlides.map(s => ({
      priority: s.priority,
      title: s.title,
      description: s.description,
      suggestedContent: s.suggestedContent
    })),
    pages: data.pages.map(p => ({
      page_number: p.pageNumber,
      title: p.title,
      score: p.score,
      content: p.content || null,
      feedback: p.feedback || null,
      recommendations: p.recommendations || null,
      ideal_version: p.idealVersion || null,
      thumbnail: p.thumbnailUrl || null,
      image_url: p.imageUrl || null
    }))
  };
}

function getInvestmentGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'C-';
}

function getFundingOdds(score: number): string {
  if (score >= 85) return 'Very High';
  if (score >= 70) return 'High';
  if (score >= 55) return 'Low';
  return 'Very Low';
}
