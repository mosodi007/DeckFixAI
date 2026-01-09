import { AlertCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface IssuesSectionProps {
  issues: string[];
}

export function IssuesSection({ issues }: IssuesSectionProps) {
  if (!issues || issues.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-slate-900">Key Issues to Address</h3>
        </div>
        <p className="text-sm text-green-700 font-medium">No critical issues identified. Great work!</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="w-6 h-6 text-orange-600" />
        <h3 className="text-xl font-bold text-slate-900">Key Issues to Address</h3>
        <span className="ml-auto text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>
      <ul className="space-y-3">
        {issues.map((issue: string, index: number) => (
          <li key={index} className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-orange-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700">{issue}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
