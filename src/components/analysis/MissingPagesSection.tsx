import { FileQuestion, AlertCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface MissingSlide {
  priority: string;
  title: string;
  description: string;
  suggestedContent: string;
}

interface MissingPagesSectionProps {
  missingSlides: MissingSlide[];
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case 'high':
      return {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'High Priority'
      };
    case 'medium':
      return {
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        label: 'Medium Priority'
      };
    default:
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        label: 'Low Priority'
      };
  }
}

export function MissingPagesSection({ missingSlides }: MissingPagesSectionProps) {
  if (!missingSlides || missingSlides.length === 0) {
    return null;
  }

  const highPriority = missingSlides.filter(s => s.priority === 'high');
  const mediumPriority = missingSlides.filter(s => s.priority === 'medium');
  const lowPriority = missingSlides.filter(s => s.priority === 'low');

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <FileQuestion className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-slate-900">Missing Pages</h3>
        <span className="ml-auto text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {missingSlides.length} {missingSlides.length === 1 ? 'page' : 'pages'}
        </span>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            These essential slides are missing from your deck. Including them will significantly improve your pitch and meet VC expectations for a complete presentation.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {highPriority.length > 0 && (
          <div className="space-y-3">
            {highPriority.map((slide, index) => {
              const config = getPriorityConfig(slide.priority);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <FileQuestion className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{slide.title}</h4>
                      <p className="text-sm text-slate-700 mb-3">{slide.description}</p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block mb-2">
                          Suggested Content:
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{slide.suggestedContent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mediumPriority.length > 0 && (
          <div className="space-y-3">
            {mediumPriority.map((slide, index) => {
              const config = getPriorityConfig(slide.priority);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <FileQuestion className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{slide.title}</h4>
                      <p className="text-sm text-slate-700 mb-3">{slide.description}</p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block mb-2">
                          Suggested Content:
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{slide.suggestedContent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {lowPriority.length > 0 && (
          <div className="space-y-3">
            {lowPriority.map((slide, index) => {
              const config = getPriorityConfig(slide.priority);

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${config.border} ${config.bg} transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <FileQuestion className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{slide.title}</h4>
                      <p className="text-sm text-slate-700 mb-3">{slide.description}</p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block mb-2">
                          Suggested Content:
                        </span>
                        <p className="text-sm text-slate-700 leading-relaxed">{slide.suggestedContent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
