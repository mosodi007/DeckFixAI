import { AlertCircle, Lightbulb, Wand2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface IssueCardProps {
  issue: {
    type: 'issue' | 'improvement';
    priority: string;
    title: string;
    description: string;
    pageNumber: number;
  };
}

export function IssueCard({ issue }: IssueCardProps) {
  const [isFixed, setIsFixed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const handleAction = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsFixed(true);
    setIsLoading(false);
  };

  if (isFixed) {
    return (
      <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-xl p-5 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-1">
              {issue.type === 'issue' ? 'Issue Fixed!' : 'Improvement Applied!'}
            </h4>
            <p className="text-sm text-green-700">
              Changes have been applied to Slide {issue.pageNumber}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-xl p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          issue.type === 'issue' ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          {issue.type === 'issue' ? (
            <AlertCircle className="w-5 h-5 text-orange-600" />
          ) : (
            <Lightbulb className="w-5 h-5 text-blue-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityColor(issue.priority)}`}>
              {issue.priority}
            </span>
            <span className="text-xs text-slate-500">Slide {issue.pageNumber}</span>
          </div>

          <h4 className="font-semibold text-slate-900 mb-2">
            {issue.title}
          </h4>

          <p className="text-sm text-slate-600 mb-4">
            {issue.description}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-wait'
                  : issue.type === 'issue'
                  ? 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              {isLoading ? 'Applying...' : issue.type === 'issue' ? 'Fix Issue' : 'Apply Improvement'}
            </button>

            <button
              className="px-4 py-2 rounded-lg font-medium text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
