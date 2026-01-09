import { AlertCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface IssuesSectionProps {
  issues: string[];
}

export function IssuesSection({ issues }: IssuesSectionProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-6 h-6 text-orange-600" />
        <h3 className="text-xl font-bold text-slate-900">Key Issues to Address</h3>
      </div>
      <ul className="space-y-3">
        {issues.map((issue: string, index: number) => (
          <li key={index} className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700">{issue}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
