import { SummarySection } from './analysis/SummarySection';
import { KeyMetricsSection } from './analysis/KeyMetricsSection';
import { BusinessSummarySection } from './analysis/BusinessSummarySection';
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
        overallScore={data.overallScore}
        investmentGrade={data.investmentGrade}
        fundingOdds={data.fundingOdds}
        onNewAnalysis={onNewAnalysis}
        onOpenImprovementFlow={onOpenImprovementFlow}
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

      <BusinessSummarySection summary={data.businessSummary} />

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
