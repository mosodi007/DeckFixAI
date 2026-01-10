import { X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ScoreCircle } from '../ScoreCircle';

interface OverallScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function OverallScoreModal({ isOpen, onClose, overallScore }: OverallScoreModalProps) {
  if (!isOpen) return null;

  const benchmark = getScoreBenchmark(overallScore);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Overall Score</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Benchmark:</span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              50-65 = Average | 70-79 = Good | 80+ = Excellent
            </p>
          </div>

          <div className="flex items-center justify-center py-8">
            <ScoreCircle score={overallScore} size={200} />
          </div>

          <GlassCard blur="md" className="mt-6 p-5" hover={false}>
            <div className="space-y-3">
              <p className="text-base text-slate-700 leading-relaxed">
                Your pitch deck scores in the <span className={`font-bold ${benchmark.color}`}>{benchmark.percentile}</span> of analyzed decks
              </p>
              <p className="text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
                {benchmark.label}
              </p>
              <p className="text-sm text-slate-600 pt-2 border-t border-slate-200 leading-relaxed">
                {benchmark.improvement}
              </p>
            </div>
          </GlassCard>
        </div>
      </GlassCard>
    </div>
  );
}
