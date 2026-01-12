import { useState } from 'react';
import { TrendingUp, Zap, Target, Download, FileStack, AlignLeft, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { MetricDetailModal } from './MetricDetailModal';
import { OverallScoreModal } from './OverallScoreModal';
import { normalizeScoreTo0To100, formatScore } from '../../utils/scoreUtils';

interface SummarySectionProps {
  fileName: string;
  companyName: string;
  overallScore: number;
  investmentGrade: string;
  fundingOdds: 'Very High' | 'High' | 'Low' | 'Very Low';
  businessSummary: string;
  totalPages: number;
  wordDensity: string;
  criticalIssuesCount: number;
  overallScoreFeedback: string | null;
  investmentGradeFeedback: string | null;
  fundingOddsFeedback: string | null;
  wordDensityFeedback: string | null;
  criticalIssuesFeedback: string | null;
  pageCountFeedback: string | null;
  // Additional data for better analysis display
  pages?: Array<{
    pageNumber: number;
    title: string;
    score: number;
    content: string;
    feedback: string | null;
  }>;
  dealBreakers?: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
  redFlags?: Array<{
    title: string;
    description: string;
    severity: string;
    category: string;
  }>;
  issues?: Array<{
    title: string;
    description: string;
    priority: string;
    pageNumber: number | null;
  }>;
}

export function SummarySection({
  fileName,
  companyName,
  overallScore,
  investmentGrade,
  fundingOdds,
  businessSummary,
  totalPages,
  wordDensity,
  criticalIssuesCount,
  overallScoreFeedback,
  investmentGradeFeedback,
  fundingOddsFeedback,
  wordDensityFeedback,
  criticalIssuesFeedback,
  pageCountFeedback,
  pages = [],
  dealBreakers = [],
  redFlags = [],
  issues = []
}: SummarySectionProps) {
  const [isOverallScoreModalOpen, setIsOverallScoreModalOpen] = useState(false);
  
  // Calculate more accurate metrics from actual data
  // Count all issues that need attention: deal breakers + all red flags + all high/medium priority issues + missing slides
  const actualCriticalIssuesCount = dealBreakers.length + 
    redFlags.length + // Count all red flags, not just critical
    issues.filter(i => i.priority === 'High' || i.priority === 'Medium').length;
  
  const calculatedCriticalIssuesCount = actualCriticalIssuesCount > 0 ? actualCriticalIssuesCount : criticalIssuesCount;
  
  // Generate comprehensive critical issues feedback from actual data
  const generateCriticalIssuesFeedback = (): string | null => {
    if (calculatedCriticalIssuesCount === 0) {
      return 'No critical issues found. Your pitch deck is in good shape!';
    }
    
    const parts: string[] = [];
    if (dealBreakers.length > 0) {
      parts.push(`${dealBreakers.length} deal-breaker${dealBreakers.length > 1 ? 's' : ''} that make your deck uninvestable`);
    }
    if (redFlags.length > 0) {
      parts.push(`${redFlags.length} red flag${redFlags.length > 1 ? 's' : ''}`);
    }
    const highMediumPriorityIssues = issues.filter(i => i.priority === 'High' || i.priority === 'Medium');
    if (highMediumPriorityIssues.length > 0) {
      parts.push(`${highMediumPriorityIssues.length} high/medium-priority issue${highMediumPriorityIssues.length > 1 ? 's' : ''}`);
    }
    
    return `Found ${calculatedCriticalIssuesCount} issue${calculatedCriticalIssuesCount > 1 ? 's' : ''} that need attention: ${parts.join(', ')}. These should be addressed before approaching investors.`;
  };
  
  const finalCriticalIssuesFeedback = criticalIssuesFeedback || generateCriticalIssuesFeedback();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    value: string | number;
    feedback: string | null;
    icon: React.ComponentType<{ className?: string }>;
  }>({
    isOpen: false,
    title: '',
    value: '',
    feedback: null,
    icon: FileStack,
  });

  const openModal = (title: string, value: string | number, feedback: string | null, icon: React.ComponentType<{ className?: string }>) => {
    setModalState({ isOpen: true, title, value, feedback, icon });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getFundingOddsColor = (odds: string) => {
    if (odds === 'Very High') return 'text-green-600';
    if (odds === 'High') return 'text-blue-600';
    if (odds === 'Low') return 'text-orange-600';
    return 'text-red-600';
  };

  const getWordDensityColor = (density: string) => {
    if (density === 'Low') return 'text-green-600';
    if (density === 'Medium') return 'text-blue-600';
    if (density === 'High') return 'text-orange-600';
    return 'text-red-600';
  };

  const getCriticalIssuesColor = (count: number) => {
    if (count === 0) return 'text-green-600';
    if (count <= 2) return 'text-blue-600';
    if (count <= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <GlassCard className="p-8 mb-8" hover={false}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {companyName}
          </h2>
          <p className="text-slate-600">{fileName}</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Export Report
        </Button>
      </div>
      <div className="border-t border-slate-200 pt-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pitch Deck Summary</h3>
          </div>
        </div>
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {businessSummary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Overall Score"
          value={typeof overallScore === 'number' 
            ? parseFloat(formatScore(overallScore))
            : overallScore}
          suffix="/10"
          icon={TrendingUp}
          onClick={() => setIsOverallScoreModalOpen(true)}
        />
        <StatCard
          label="Investment Grade"
          value={investmentGrade}
          icon={Target}
          valueClassName={getGradeColor(investmentGrade)}
          onClick={() => openModal('Investment Grade', investmentGrade, investmentGradeFeedback, Target)}
        />
        <StatCard
          label="Funding Odds"
          value={fundingOdds}
          icon={Zap}
          valueClassName={getFundingOddsColor(fundingOdds)}
          onClick={() => openModal('Funding Odds', fundingOdds, fundingOddsFeedback, Zap)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Page Count"
          value={totalPages}
          suffix=" pages"
          icon={FileStack}
          onClick={() => openModal('Page Count', `${totalPages} pages`, pageCountFeedback, FileStack)}
        />
        <StatCard
          label="Word Density"
          value={wordDensity}
          icon={AlignLeft}
          valueClassName={getWordDensityColor(wordDensity)}
          onClick={() => openModal('Word Density', wordDensity, wordDensityFeedback, AlignLeft)}
        />
        <StatCard
          label="Critical Issues"
          value={calculatedCriticalIssuesCount}
          icon={AlertTriangle}
          valueClassName={getCriticalIssuesColor(calculatedCriticalIssuesCount)}
          onClick={() => openModal('Critical Issues', calculatedCriticalIssuesCount, finalCriticalIssuesFeedback, AlertTriangle)}
        />
      </div>

      <MetricDetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        value={modalState.value}
        feedback={modalState.feedback}
        icon={modalState.icon}
      />

      <OverallScoreModal
        isOpen={isOverallScoreModalOpen}
        onClose={() => setIsOverallScoreModalOpen(false)}
        overallScore={typeof overallScore === 'number' 
          ? normalizeScoreTo0To100(overallScore)
          : 0}
      />
    </GlassCard>
  );
}
