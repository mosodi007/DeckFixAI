import { GlassCard } from '../ui/GlassCard';
import { ScoreCircle } from '../ScoreCircle';
import { normalizeScoreTo0To100 } from '../../utils/scoreUtils';

interface ScoreDistributionSectionProps {
  overallScore: number;
}

function getScoreBenchmark(score: number) {
  const scoreValue = score;

  if (scoreValue >= 80) {
    return {
      percentile: 'top 5%',
      label: 'Excellent - Investor Ready',
      color: 'text-green-700',
      improvement: 'This deck meets VC standards. Focus on final polish and pitch delivery.'
    };
  } else if (scoreValue >= 70) {
    return {
      percentile: 'top 15%',
      label: 'Good - Nearly Ready',
      color: 'text-blue-700',
      improvement: 'Address key issues and this deck will be investor-ready.'
    };
  } else if (scoreValue >= 50) {
    return {
      percentile: 'top 50%',
      label: 'Average - Needs Work',
      color: 'text-yellow-700',
      improvement: 'Significant improvements needed before approaching investors.'
    };
  } else {
    return {
      percentile: 'bottom 50%',
      label: 'Below Average - Major Revisions Needed',
      color: 'text-orange-700',
      improvement: 'This deck is not ready for investors. Address all critical issues first.'
    };
  }
}

export function ScoreDistributionSection({ overallScore }: ScoreDistributionSectionProps) {
  const score0To100 = normalizeScoreTo0To100(overallScore);
  const benchmark = getScoreBenchmark(score0To100);

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Overall Score</h3>
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Benchmark:</span> 50-65 = Average | 70-79 = Good | 80+ = Excellent
        </p>
      </div>
      <div className="flex items-center justify-center h-64">
        <ScoreCircle score={score0To100} size={200} />
      </div>
      <GlassCard blur="md" className="mt-4 p-4" hover={false}>
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-600">
            Your pitch deck scores in the <span className={`font-bold ${benchmark.color}`}>{benchmark.percentile}</span> of analyzed decks
          </p>
          <p className="text-xs font-semibold text-slate-900">{benchmark.label}</p>
          <p className="text-xs text-slate-600 pt-2 border-t border-slate-200">
            {benchmark.improvement}
          </p>
        </div>
      </GlassCard>
    </GlassCard>
  );
}
