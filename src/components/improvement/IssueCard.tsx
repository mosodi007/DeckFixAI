import { AlertCircle, Lightbulb, FilePlus, TrendingDown, Target, AlertTriangle } from 'lucide-react';

interface IssueCardProps {
  issue: {
    type: 'issue' | 'improvement' | 'missing_slide' | 'deal_breaker' | 'red_flag';
    priority: string;
    title: string;
    description: string;
    pageNumber: number | null;
    impact?: string;
    recommendation?: string;
    suggestedContent?: string;
    severity?: string;
    category?: string;
  };
  onGenerateFix?: () => void;
  isGenerating?: boolean;
}

export function IssueCard({ issue, onGenerateFix, isGenerating }: IssueCardProps) {

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getIconConfig = () => {
    if (issue.type === 'deal_breaker') {
      return {
        bgColor: 'bg-red-100',
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        badgeColor: 'bg-red-100 text-red-700 border-red-300',
        badgeText: 'DEAL-BREAKER'
      };
    }
    if (issue.type === 'red_flag') {
      return {
        bgColor: 'bg-orange-100',
        icon: <TrendingDown className="w-5 h-5 text-orange-600" />,
        badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
        badgeText: 'RED FLAG'
      };
    }
    if (issue.type === 'missing_slide') {
      return {
        bgColor: 'bg-slate-100',
        icon: <FilePlus className="w-5 h-5 text-slate-600" />,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
        badgeText: 'MISSING CONTENT'
      };
    }
    if (issue.type === 'issue') {
      return {
        bgColor: 'bg-yellow-100',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        badgeText: 'ISSUE'
      };
    }
    return {
      bgColor: 'bg-black/50',
      icon: <Target className="w-5 h-5 text-black-600" />,
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-300',
      badgeText: 'IMPROVEMENT'
    };
  };

  const iconConfig = getIconConfig();

  return (
    <div className={`bg-white/90 backdrop-blur-sm border rounded-xl p-6 hover:shadow-md transition-all duration-300 ${
      issue.type === 'deal_breaker' ? 'border-red-300 bg-red-50/30' :
      issue.type === 'red_flag' ? 'border-orange-300 bg-orange-50/30' :
      'border-slate-200/60'
    }`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconConfig.bgColor}`}>
          {iconConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${iconConfig.badgeColor}`}>
              {iconConfig.badgeText}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(issue.priority)}`}>
              {issue.priority} Priority
            </span>
            {issue.severity && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} Severity
              </span>
            )}
            {issue.category && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
              </span>
            )}
            {issue.pageNumber ? (
              <span className="text-xs text-slate-500 ml-auto">Slide {issue.pageNumber}</span>
            ) : (
              <button
                onClick={onGenerateFix}
                disabled={isGenerating}
                className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-800 transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  'Generate Instant Fix'
                )}
              </button>
            )}
          </div>

          <h4 className="font-bold text-slate-900 mb-2 text-base">
            {issue.title}
          </h4>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Issue:</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {issue.description}
              </p>
            </div>

            {issue.impact && (
              <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-1.5">
                  Investor Impact:
                </p>
                <p className="text-sm text-red-800 leading-relaxed">
                  {issue.impact}
                </p>
              </div>
            )}

            {issue.recommendation && (
              <div className=" border rounded-lg p-3">
                <p className="text-sm font-semibold text-black-900 mb-1 flex items-center gap-1.5">
                  Recommendation:
                </p>
                <p className="text-sm text-[#000] leading-relaxed">
                  {issue.recommendation}
                </p>
              </div>
            )}

            {issue.suggestedContent && (
              <div className="bg-green-50/50 border border-green-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-green-900 mb-1">Suggested Content:</p>
                <p className="text-sm text-green-800 leading-relaxed">
                  {issue.suggestedContent}
                </p>
              </div>
            )}
          </div>

          {issue.pageNumber && (
            <div className="mt-4 text-xs text-slate-500 italic">
              Review this slide and use the "Fix This" button to get AI-powered implementation-ready fixes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
