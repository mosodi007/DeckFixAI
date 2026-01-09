import { GlassCard } from '../ui/GlassCard';
import { MetricCard } from '../MetricCard';

interface MetricsSectionProps {
  metrics: {
    tractionScore: number;
    disruptionScore: number;
    deckQuality: number;
    marketSize: number;
    teamStrength: number;
    financialProjections: number;
  };
  onMetricClick: (metric: string) => void;
}

export function MetricsSection({ metrics, onMetricClick }: MetricsSectionProps) {
  return (
    <GlassCard className=" p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Performance</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Traction Score"
          value={metrics.tractionScore}
          max={10}
          color="blue"
          onClick={() => onMetricClick('traction')}
        />
        <MetricCard
          label="Disruption Signal"
          value={metrics.disruptionScore}
          max={10}
          color="cyan"
          onClick={() => onMetricClick('disruption')}
        />
        <MetricCard
          label="Deck Quality"
          value={metrics.deckQuality}
          max={10}
          color="green"
          onClick={() => onMetricClick('deckQuality')}
        />
        <MetricCard
          label="Market Size"
          value={metrics.marketSize}
          max={10}
          color="purple"
          onClick={() => onMetricClick('marketSize')}
        />
        <MetricCard
          label="Team Strength"
          value={metrics.teamStrength}
          max={10}
          color="orange"
          onClick={() => onMetricClick('teamStrength')}
        />
        <MetricCard
          label="Financials"
          value={metrics.financialProjections}
          max={10}
          color="pink"
          onClick={() => onMetricClick('financials')}
        />
      </div>
    </GlassCard>
  );
}
