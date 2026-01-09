import { AnalysisData } from '../services/analysisService';

export function adaptAnalysisData(data: AnalysisData) {
  return {
    fileName: data.fileName,
    uploadDate: data.createdAt,
    overallScore: data.overallScore / 10,
    investmentGrade: getInvestmentGrade(data.overallScore),
    fundingOdds: getFundingOdds(data.overallScore),
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
    metrics: {
      tractionScore: data.metrics.contentScore / 10,
      disruptionScore: data.metrics.structureScore / 10,
      deckQuality: data.metrics.designScore / 10,
      marketSize: data.metrics.contentScore / 10,
      teamStrength: data.metrics.contentScore / 10,
      financialProjections: data.metrics.contentScore / 10
    },
    strengths: data.metrics.strengths,
    issues: data.metrics.weaknesses,
    improvements: data.issues
      .filter(i => i.type === 'improvement')
      .map(i => ({
        priority: i.priority,
        issue: i.title,
        impact: i.description,
        pageNumber: i.pageNumber || 1
      })),
    missingSlides: data.missingSlides.map(s => ({
      priority: s.priority,
      title: s.title,
      description: s.description,
      suggestedContent: s.suggestedContent
    })),
    pages: data.pages.map(p => ({
      pageNumber: p.pageNumber,
      title: p.title,
      score: p.score,
      thumbnail: null
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
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}
