import { TrendingUp, Zap, Target, Download, Wand2, Layout, FileUp, FileText } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';

interface SummarySectionProps {
  fileName: string;
  overallScore: number;
  investmentGrade: string;
  fundingOdds: 'Very High' | 'High' | 'Low' | 'Very Low';
  businessSummary: string;
  onNewAnalysis: () => void;
  onOpenImprovementFlow: () => void;
}

export function SummarySection({ fileName, overallScore, investmentGrade, fundingOdds, businessSummary, onNewAnalysis, onOpenImprovementFlow }: SummarySectionProps) {
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

  return (
    <GlassCard className="p-8 mb-8" hover={false}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
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
        />
        <StatCard
          label="Investment Grade"
          value={investmentGrade}
          icon={Target}
          valueClassName={getGradeColor(investmentGrade)}
        />
        <StatCard
          label="Funding Odds"
          value={fundingOdds}
          icon={Zap}
          valueClassName={getFundingOddsColor(fundingOdds)}
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
    </GlassCard>
  );
}
