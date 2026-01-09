import { useState } from 'react';
import { MetricModal } from './MetricModal';
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

type MetricType = 'traction' | 'disruption' | 'deckQuality' | 'marketSize' | 'teamStrength' | 'financials' | null;

export function AnalysisView({ data, onNewAnalysis, onOpenImprovementFlow }: AnalysisViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);

  const metricBreakdowns = {
    traction: [
      { category: 'User Growth', score: 8, status: 'good' as const, feedback: 'Strong month-over-month growth rate of 25%' },
      { category: 'Revenue Metrics', score: 7, status: 'good' as const, feedback: 'Solid revenue trajectory with clear monetization' },
      { category: 'Engagement', score: 6, status: 'warning' as const, feedback: 'Good engagement but could improve retention metrics' },
      { category: 'Market Validation', score: 7, status: 'good' as const, feedback: 'Strong early customer testimonials and case studies' },
    ],
    disruption: [
      { category: 'Innovation Level', score: 9, status: 'good' as const, feedback: 'Novel approach to solving existing problem' },
      { category: 'Competitive Advantage', score: 7, status: 'good' as const, feedback: 'Clear differentiation from competitors' },
      { category: 'Market Timing', score: 8, status: 'good' as const, feedback: 'Excellent timing with current market trends' },
      { category: 'Scalability', score: 6, status: 'warning' as const, feedback: 'Good scalability potential but needs validation' },
    ],
    deckQuality: [
      { category: 'Team Quality', score: 7, status: 'good' as const, feedback: 'Experienced team with relevant domain expertise' },
      { category: 'Market Size', score: 8, status: 'good' as const, feedback: 'Large addressable market with clear growth potential' },
      { category: 'Competitive Advantage', score: 7, status: 'good' as const, feedback: 'Strong differentiation and defensible moat' },
      { category: 'Growth Strategy', score: 6, status: 'warning' as const, feedback: 'Clear strategy but needs more detailed execution plan' },
      { category: 'Market Heat', score: 8, status: 'good' as const, feedback: 'High investor interest in this sector currently' },
      { category: 'Traction Metrics', score: 8, status: 'good' as const, feedback: 'Strong metrics with clear evidence of product-market fit' },
    ],
    marketSize: [
      { category: 'TAM Analysis', score: 8, status: 'good' as const, feedback: 'Well-researched total addressable market' },
      { category: 'Market Growth', score: 7, status: 'good' as const, feedback: 'Strong growth trajectory in target market' },
      { category: 'Market Access', score: 6, status: 'warning' as const, feedback: 'Path to market needs more detail' },
      { category: 'Market Validation', score: 7, status: 'good' as const, feedback: 'Good evidence of market demand' },
    ],
    teamStrength: [
      { category: 'Relevant Experience', score: 6, status: 'warning' as const, feedback: 'Team has good experience but could highlight domain expertise more' },
      { category: 'Track Record', score: 7, status: 'good' as const, feedback: 'Solid previous achievements and exits' },
      { category: 'Team Completeness', score: 5, status: 'warning' as const, feedback: 'Core team is strong but missing key technical roles' },
      { category: 'Advisor Network', score: 8, status: 'good' as const, feedback: 'Impressive roster of advisors and mentors' },
    ],
    financials: [
      { category: 'Revenue Model', score: 7, status: 'good' as const, feedback: 'Clear and validated revenue streams' },
      { category: 'Financial Projections', score: 6, status: 'warning' as const, feedback: 'Projections are ambitious but could use more supporting data' },
      { category: 'Unit Economics', score: 8, status: 'good' as const, feedback: 'Strong unit economics with clear path to profitability' },
      { category: 'Burn Rate', score: 7, status: 'good' as const, feedback: 'Reasonable burn rate with sufficient runway' },
    ],
  };

  const metricConfig = {
    traction: { name: 'Traction Score', value: data.metrics.tractionScore, color: 'blue' as const },
    disruption: { name: 'Disruption Signal', value: data.metrics.disruptionScore, color: 'cyan' as const },
    deckQuality: { name: 'Deck Quality', value: data.metrics.deckQuality, color: 'green' as const },
    marketSize: { name: 'Market Size', value: data.metrics.marketSize, color: 'purple' as const },
    teamStrength: { name: 'Team Strength', value: data.metrics.teamStrength, color: 'orange' as const },
    financials: { name: 'Financials', value: data.metrics.financialProjections, color: 'pink' as const },
  };

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
        <MetricsSection
          metrics={data.metrics}
          onMetricClick={(metric) => setSelectedMetric(metric as MetricType)}
        />
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

      {selectedMetric && (
        <MetricModal
          isOpen={true}
          onClose={() => setSelectedMetric(null)}
          metricName={metricConfig[selectedMetric].name}
          score={metricConfig[selectedMetric].value}
          max={10}
          color={metricConfig[selectedMetric].color}
          breakdown={metricBreakdowns[selectedMetric]}
        />
      )}
    </div>
  );
}
