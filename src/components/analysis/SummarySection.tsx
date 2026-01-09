import { TrendingUp, Zap, Target, Download, Wand2, Layout } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';

interface SummarySectionProps {
  fileName: string;
  overallScore: number;
  investmentGrade: string;
  fundingOdds: number;
}

export function SummarySection({ fileName, overallScore, investmentGrade, fundingOdds }: SummarySectionProps) {
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <GlassCard className="shadow-xl p-8 mb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
          <p className="text-slate-600">{fileName}</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          value={`${fundingOdds}%`}
          icon={Zap}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="primary" icon={Wand2} className="flex-1">
          Fix Issues Automatically
        </Button>
        <Button variant="secondary" icon={Layout} className="flex-1">
          Explore Templates
        </Button>
      </div>
    </GlassCard>
  );
}
