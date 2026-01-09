import { GlassCard } from '../ui/GlassCard';
import { ScoreCircle } from '../ScoreCircle';

interface ScoreDistributionSectionProps {
  overallScore: number;
}

export function ScoreDistributionSection({ overallScore }: ScoreDistributionSectionProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Score Distribution</h3>
      <div className="flex items-center justify-center h-64">
        <ScoreCircle score={overallScore * 10} size={200} />
      </div>
      <GlassCard blur="md" className="mt-4 p-4" hover={false}>
        <p className="text-sm text-slate-600 text-center">
          Your pitch deck scores in the <span className="font-semibold text-slate-900">top 32%</span> of analyzed decks.
          With recommended improvements, you could reach the <span className="font-semibold text-slate-900">top 15%</span>.
        </p>
      </GlassCard>
    </GlassCard>
  );
}
