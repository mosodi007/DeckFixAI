import { GlassCard } from '../ui/GlassCard';
import { MetricCard } from '../MetricCard';

interface MetricsSectionProps {
  metrics: {
    contentScore: number;
    clarityScore: number;
    structureScore: number;
    designScore: number;
  };
}

export function MetricsSection({ metrics }: MetricsSectionProps) {
  const averageScore = (metrics.contentScore + metrics.clarityScore + metrics.structureScore + metrics.designScore) / 4;

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Performance Metrics</h3>
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Scoring Context:</span> 5.0-6.5 = Average | 7.0+ = Good | 8.0+ = Excellent
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Content Score"
          value={metrics.contentScore}
          max={10}
          color="blue"
        />
        <MetricCard
          label="Clarity Score"
          value={metrics.clarityScore}
          max={10}
          color="green"
        />
        <MetricCard
          label="Structure Score"
          value={metrics.structureScore}
          max={10}
          color="cyan"
        />
        <MetricCard
          label="Design Score"
          value={metrics.designScore}
          max={10}
          color="purple"
        />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Average Score</span>
          <span className="text-lg font-bold text-slate-900">{averageScore.toFixed(1)}/10</span>
        </div>
      </div>
    </GlassCard>
  );
}
