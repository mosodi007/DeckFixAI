import { GlassCard } from '../ui/GlassCard';

const analysisSteps = [
  'Extracting content and structure',
  'Analyzing market opportunity and traction',
  'Evaluating team and execution capability',
  'Assessing financial projections',
  'Comparing against successful funding patterns',
  'Generating recommendations'
];

export function AnalysisProgress() {
  return (
    <GlassCard className="mt-8 p-6">
      <h4 className="font-semibold text-slate-900 mb-4">Analyzing your pitch deck...</h4>
      <div className="space-y-3">
        {analysisSteps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 bg-slate-700 rounded-full animate-pulse" />
            <span className="text-sm text-slate-600">{step}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
