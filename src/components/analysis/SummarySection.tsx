import { useState } from 'react';
import { TrendingUp, Zap, Target, Download, Wand2, Layout, FileUp, FileText, FileStack, AlignLeft, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { MetricDetailModal } from './MetricDetailModal';

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
  onNewAnalysis: () => void;
  onOpenImprovementFlow: () => void;
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
  onNewAnalysis,
  onOpenImprovementFlow
}: SummarySectionProps) {
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
            PitchDeck for {companyName}
          </h2>
          <p className="text-slate-600">{fileName}</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Overall Score"
          value={overallScore}
          suffix="/10"
          icon={TrendingUp}
          onClick={() => openModal('Overall Score', `${overallScore}/10`, overallScoreFeedback, TrendingUp)}
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
          value={criticalIssuesCount}
          icon={AlertTriangle}
          valueClassName={getCriticalIssuesColor(criticalIssuesCount)}
          onClick={() => openModal('Critical Issues', criticalIssuesCount, criticalIssuesFeedback, AlertTriangle)}
        />
      </div>

      <div className="border-t border-slate-200 pt-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Business Summary</h3>
            <p className="text-sm text-slate-600">Executive overview of your pitch deck</p>
          </div>
        </div>
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {businessSummary}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" icon={Wand2} className="flex-1" onClick={onOpenImprovementFlow}>
          Improve & Fix Issues
        </Button>
        <Button variant="secondary" icon={FileUp} className="flex-1" onClick={onNewAnalysis}>
          Analyze New Deck
        </Button>
      </div>

      <MetricDetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        value={modalState.value}
        feedback={modalState.feedback}
        icon={modalState.icon}
      />
    </GlassCard>
  );
}
