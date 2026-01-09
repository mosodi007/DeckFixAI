import { CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface StrengthsSectionProps {
  strengths: string[];
}

export function StrengthsSection({ strengths }: StrengthsSectionProps) {
  if (!strengths || strengths.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-6 h-6 text-slate-400" />
          <h3 className="text-xl font-bold text-slate-900">Key Strengths</h3>
        </div>
        <p className="text-sm text-slate-600 italic">No significant strengths identified. Focus on improvements.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-bold text-slate-900">Key Strengths</h3>
        <span className="ml-auto text-sm font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
          {strengths.length} {strengths.length === 1 ? 'strength' : 'strengths'}
        </span>
      </div>
      <ul className="space-y-3">
        {strengths.map((strength: string, index: number) => (
          <li key={index} className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-green-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700">{strength}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
