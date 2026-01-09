import { ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Improvement {
  priority: string;
  issue: string;
  impact: string;
}

interface ImprovementsSectionProps {
  improvements: Improvement[];
  onOpenImprovementFlow: () => void;
}

export function ImprovementsSection({ improvements, onOpenImprovementFlow }: ImprovementsSectionProps) {
  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Priority Improvements</h3>
      <div className="space-y-4">
        {improvements.map((improvement, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
              {improvement.priority}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 mb-1">{improvement.issue}</h4>
              <p className="text-sm text-slate-600">{improvement.impact}</p>
            </div>
            <button
              onClick={onOpenImprovementFlow}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-white/60 rounded-xl transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
