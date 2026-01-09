import { SummarySection } from './analysis/SummarySection';
import { GeneralReviewSection } from './analysis/GeneralReviewSection';
import { KeyMetricsSection } from './analysis/KeyMetricsSection';
import { StageAssessmentSection } from './analysis/StageAssessmentSection';
import { InvestmentReadinessSection } from './analysis/InvestmentReadinessSection';
import { DealBreakersSection } from './analysis/DealBreakersSection';
import { RedFlagsSection } from './analysis/RedFlagsSection';
import { MetricsSection } from './analysis/MetricsSection';
import { ScoreDistributionSection } from './analysis/ScoreDistributionSection';
import { StrengthsSection } from './analysis/StrengthsSection';
import { IssuesSection } from './analysis/IssuesSection';
import { ImprovementsSection } from './analysis/ImprovementsSection';

interface AnalysisViewProps {
  data: any;
  onNewAnalysis: () => void;
  onOpenImprovementFlow: () => void;
}

export function AnalysisView({ data, onNewAnalysis, onOpenImprovementFlow }: AnalysisViewProps) {

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <SummarySection
        fileName={data.fileName}
        companyName={data.keyMetrics.companyName}
        overallScore={data.overallScore}
        investmentGrade={data.investmentGrade}
        fundingOdds={data.fundingOdds}
        businessSummary={data.businessSummary}
        onNewAnalysis={onNewAnalysis}
        onOpenImprovementFlow={onOpenImprovementFlow}
      />

      <GeneralReviewSection
        overallScore={data.overallScore}
        investmentGrade={data.investmentGrade}
        dealBreakersCount={data.dealBreakers?.length || 0}
        redFlagsCount={data.redFlags?.length || 0}
        investmentReady={data.investmentReady}
        strengths={data.strengths || []}
        issues={data.issues || []}
      />

      <KeyMetricsSection
        company={data.keyMetrics.company}
        industry={data.keyMetrics.industry}
        currentRevenue={data.keyMetrics.currentRevenue}
        fundingSought={data.keyMetrics.fundingSought}
        growthRate={data.keyMetrics.growthRate}
        teamSize={data.keyMetrics.teamSize}
        marketSize={data.keyMetrics.marketSize}
        valuation={data.keyMetrics.valuation}
        businessModel={data.keyMetrics.businessModel}
        customerCount={data.keyMetrics.customerCount}
      />

      <StageAssessmentSection
        stageAssessment={data.stageAssessment}
        fundingStage={data.fundingStage}
      />

      <InvestmentReadinessSection investmentReadiness={data.investmentReadiness} />

      <DealBreakersSection dealBreakers={data.dealBreakers || []} />

      <RedFlagsSection redFlags={data.redFlags || []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <MetricsSection metrics={data.metrics} />
        <ScoreDistributionSection overallScore={data.overallScore} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <StrengthsSection strengths={data.strengths} />
        <IssuesSection issues={data.issues} />
      </div>

      <ImprovementsSection
        improvements={data.improvements}
        onOpenImprovementFlow={onOpenImprovementFlow}
      />
    </div>
  );
}
