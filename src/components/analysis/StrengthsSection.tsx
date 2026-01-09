import { CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface StrengthsSectionProps {
  strengths: string[];
}

export function StrengthsSection({ strengths }: StrengthsSectionProps) {
  return (
    <GlassCard className="shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-bold text-slate-900">Key Strengths</h3>
      </div>
      <ul className="space-y-3">
        {strengths.map((strength: string, index: number) => (
          <li key={index} className="flex items-start gap-3 p-3 bg-white/40 backdrop-blur-md rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700">{strength}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
