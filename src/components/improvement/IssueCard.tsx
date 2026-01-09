import { AlertCircle, Lightbulb, Wand2, CheckCircle2, FilePlus, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

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
              {issue.type === 'missing_slide' ? 'Slide Generated!' : issue.type === 'issue' ? 'Issue Fixed!' : 'Improvement Applied!'}
            </h4>
            <p className="text-sm text-green-700">
              {issue.type === 'missing_slide'
                ? 'New slide has been generated and added to your deck'
                : `Changes have been applied to Slide ${issue.pageNumber}`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getIconConfig = () => {
    if (issue.type === 'deal_breaker') {
      return {
        bgColor: 'bg-red-100',
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        buttonColor: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5',
        buttonText: 'Fix Critical Issue',
        loadingText: 'Applying...',
        badgeColor: 'bg-red-100 text-red-700 border-red-300',
        badgeText: 'DEAL-BREAKER'
      };
    }
    if (issue.type === 'red_flag') {
      return {
        bgColor: 'bg-orange-100',
        icon: <TrendingDown className="w-5 h-5 text-orange-600" />,
        buttonColor: 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg hover:-translate-y-0.5',
        buttonText: 'Address Red Flag',
        loadingText: 'Applying...',
        badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
        badgeText: 'RED FLAG'
      };
    }
    if (issue.type === 'missing_slide') {
      return {
        bgColor: 'bg-purple-100',
        icon: <FilePlus className="w-5 h-5 text-purple-600" />,
        buttonColor: 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5',
        buttonText: 'Generate Slide',
        loadingText: 'Generating...',
        badgeColor: 'bg-purple-100 text-purple-700 border-purple-300',
        badgeText: 'MISSING CONTENT'
      };
    }
    if (issue.type === 'issue') {
      return {
        bgColor: 'bg-yellow-100',
        icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
        buttonColor: 'bg-yellow-600 text-white hover:bg-yellow-700 hover:shadow-lg hover:-translate-y-0.5',
        buttonText: 'Fix Issue',
        loadingText: 'Applying...',
        badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        badgeText: 'ISSUE'
      };
    }
    return {
      bgColor: 'bg-blue-100',
      icon: <Lightbulb className="w-5 h-5 text-blue-600" />,
      buttonColor: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5',
      buttonText: 'Apply Improvement',
      loadingText: 'Applying...',
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
              <span className="text-xs text-slate-500 ml-auto">Deck-wide</span>
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
                  <Target className="w-3.5 h-3.5" />
                  Investor Impact:
                </p>
                <p className="text-sm text-red-800 leading-relaxed">
                  {issue.impact}
                </p>
              </div>
            )}

            {issue.recommendation && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Recommendation:
                </p>
                <p className="text-sm text-blue-800 leading-relaxed">
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-wait'
                  : iconConfig.buttonColor
              }`}
            >
              <Wand2 className="w-4 h-4" />
              {isLoading ? iconConfig.loadingText : iconConfig.buttonText}
            </button>

            {issue.type !== 'deal_breaker' && (
              <button
                className="px-4 py-2.5 rounded-lg font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
