import { useState } from 'react';
import { ArrowLeft, Filter } from 'lucide-react';
import { DeckPageCard } from './improvement/DeckPageCard';
import { IssueCard } from './improvement/IssueCard';

interface ImprovementFlowViewProps {
  data: any;
  onBack: () => void;
}

export function ImprovementFlowView({ data, onBack }: ImprovementFlowViewProps) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');

  const deckPages = data?.pages || Array.from({ length: 10 }, (_, i) => ({
    pageNumber: i + 1,
    title: `Slide ${i + 1}`,
    score: Math.floor(Math.random() * 40) + 60,
    thumbnail: null
  }));

  const allIssues = [
    ...(data?.dealBreakers || []).map((breaker: any) => ({
      type: 'deal_breaker' as const,
      priority: 'high',
      title: breaker.title,
      description: breaker.description,
      recommendation: breaker.recommendation,
      pageNumber: null,
      impact: 'This is a critical issue that makes the deck uninvestable. Must be fixed before approaching investors.',
    })),
    ...(data?.redFlags || []).map((flag: any) => ({
      type: 'red_flag' as const,
      priority: flag.severity === 'critical' ? 'high' : flag.severity === 'major' ? 'medium' : 'low',
      title: flag.title,
      description: flag.description,
      impact: flag.impact,
      category: flag.category,
      severity: flag.severity,
      pageNumber: null,
    })),
    ...(data?.issues || []).map((issue: any) => ({
      type: 'issue' as const,
      priority: typeof issue === 'string' ? 'medium' : issue.priority,
      title: typeof issue === 'string' ? issue.split(':')[0] : issue.issue || issue.title,
      description: typeof issue === 'string' ? issue : issue.impact || issue.description,
      pageNumber: typeof issue === 'string' ? null : issue.pageNumber,
    })),
    ...(data?.improvements || []).map((improvement: any) => ({
      type: 'improvement' as const,
      priority: improvement.priority,
      title: improvement.issue || improvement.title,
      description: improvement.impact || improvement.description,
      pageNumber: improvement.pageNumber,
    })),
    ...(data?.missingSlides || []).map((slide: any) => ({
      type: 'missing_slide' as const,
      priority: slide.priority,
      title: slide.title,
      description: slide.description,
      suggestedContent: slide.suggestedContent,
      pageNumber: null,
    }))
  ];

  const sortedIssues = [...allIssues].sort((a, b) => {
    const typeOrder = { deal_breaker: 0, red_flag: 1, missing_slide: 2, issue: 3, improvement: 4 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    return priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()];
  });

  const filteredIssues = selectedPage === 0
    ? sortedIssues.filter(issue => filterType === 'all' || issue.type === filterType)
    : sortedIssues.filter(issue => issue.pageNumber === selectedPage && (filterType === 'all' || issue.type === filterType));

  const issueTypeCounts = {
    all: sortedIssues.length,
    deal_breaker: sortedIssues.filter(i => i.type === 'deal_breaker').length,
    red_flag: sortedIssues.filter(i => i.type === 'red_flag').length,
    issue: sortedIssues.filter(i => i.type === 'issue').length,
    improvement: sortedIssues.filter(i => i.type === 'improvement').length,
    missing_slide: sortedIssues.filter(i => i.type === 'missing_slide').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Analysis</span>
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Improve & Fix Issues</h1>
          <p className="text-slate-600">Review and address critical issues, red flags, and improvement opportunities</p>
        </div>

        {issueTypeCounts.deal_breaker > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-600 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-sm mb-1">Critical: {issueTypeCounts.deal_breaker} Deal-Breaker{issueTypeCounts.deal_breaker > 1 ? 's' : ''} Found</h3>
                <p className="text-red-800 text-sm">These issues make your deck uninvestable. Address them immediately before approaching investors.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Deck Pages */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-lg sticky top-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Deck Pages</h2>

              <button
                onClick={() => setSelectedPage(0)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-3 transition-all duration-300 ${
                  selectedPage === 0
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">All Pages</span>
                  <span className="text-sm opacity-90">{sortedIssues.length} items</span>
                </div>
              </button>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {deckPages.map((page: any) => (
                  <DeckPageCard
                    key={page.pageNumber}
                    page={page}
                    isSelected={selectedPage === page.pageNumber}
                    issueCount={sortedIssues.filter(i => i.pageNumber === page.pageNumber).length}
                    onClick={() => setSelectedPage(page.pageNumber)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Issues & Recommendations */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedPage === 0 ? 'All Issues & Recommendations' : `Slide ${selectedPage} Issues`}
                </h2>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All ({issueTypeCounts.all})</option>
                    {issueTypeCounts.deal_breaker > 0 && <option value="deal_breaker">Deal-Breakers ({issueTypeCounts.deal_breaker})</option>}
                    {issueTypeCounts.red_flag > 0 && <option value="red_flag">Red Flags ({issueTypeCounts.red_flag})</option>}
                    {issueTypeCounts.missing_slide > 0 && <option value="missing_slide">Missing Slides ({issueTypeCounts.missing_slide})</option>}
                    {issueTypeCounts.issue > 0 && <option value="issue">Issues ({issueTypeCounts.issue})</option>}
                    {issueTypeCounts.improvement > 0 && <option value="improvement">Improvements ({issueTypeCounts.improvement})</option>}
                  </select>
                </div>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {filterType === 'all' ? 'Looking Great!' : 'No items found'}
                  </h3>
                  <p className="text-slate-600">
                    {filterType === 'all' ? 'No issues found for this selection' : `No ${filterType.replace('_', ' ')}s found`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue, index) => (
                    <IssueCard
                      key={index}
                      issue={issue}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
