import { ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { BlurredContent } from '../auth/BlurredContent';

interface Improvement {
  priority: string;
  issue: string;
  impact: string;
}

interface ImprovementsSectionProps {
  improvements: Improvement[];
  onOpenImprovementFlow: () => void;
  isAuthenticated: boolean;
  onSignUpClick: () => void;
}

export function ImprovementsSection({ improvements, onOpenImprovementFlow, isAuthenticated, onSignUpClick }: ImprovementsSectionProps) {
  const getPriorityColor = (priority: string) => {
    const priorityLower = priority.toLowerCase();
    if (priorityLower === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (priorityLower === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  };

  if (!improvements || improvements.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Priority Improvements</h3>
        <p className="text-sm text-slate-600 italic">No specific improvements identified.</p>
      </GlassCard>
    );
  }

  const highPriority = improvements.filter(i => i.priority.toLowerCase() === 'high');
  const mediumPriority = improvements.filter(i => i.priority.toLowerCase() === 'medium');
  const lowPriority = improvements.filter(i => i.priority.toLowerCase() === 'low');

  return (
    <GlassCard className="p-6">
      <BlurredContent isBlurred={!isAuthenticated} onSignUpClick={onSignUpClick}>
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-xl font-bold text-slate-900">Priority Improvements</h3>
        <span className="ml-auto text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
          {improvements.length} {improvements.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {highPriority.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-red-700 mb-2 uppercase tracking-wider">High Priority</p>
          <div className="space-y-3">
            {highPriority.map((improvement, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-red-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
                  {formatPriority(improvement.priority)}
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
        </div>
      )}

      {mediumPriority.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-yellow-700 mb-2 uppercase tracking-wider">Medium Priority</p>
          <div className="space-y-3">
            {mediumPriority.map((improvement, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-yellow-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
                  {formatPriority(improvement.priority)}
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
        </div>
      )}

      {lowPriority.length > 0 && (
        <div>
          <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">Low Priority</p>
          <div className="space-y-3">
            {lowPriority.map((improvement, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
                  {formatPriority(improvement.priority)}
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
        </div>
      )}
      </BlurredContent>
    </GlassCard>
  );
}
