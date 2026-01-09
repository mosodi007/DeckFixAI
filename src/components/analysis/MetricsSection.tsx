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
  return (
    <GlassCard className=" p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Performance Metrics</h3>
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
    </GlassCard>
  );
}
