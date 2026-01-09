import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DeckPageCard } from './improvement/DeckPageCard';
import { IssueCard } from './improvement/IssueCard';

interface ImprovementFlowViewProps {
  data: any;
  onBack: () => void;
}

export function ImprovementFlowView({ data, onBack }: ImprovementFlowViewProps) {
  const [selectedPage, setSelectedPage] = useState(0);

  const deckPages = data?.pages || Array.from({ length: 10 }, (_, i) => ({
    pageNumber: i + 1,
    title: `Slide ${i + 1}`,
    score: Math.floor(Math.random() * 40) + 60,
    thumbnail: null
  }));

  const allIssues = [
    ...(data?.issues || []).map((issue: string, index: number) => ({
      type: 'issue' as const,
      priority: index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Medium' : 'Low',
      title: issue,
      description: 'This issue may negatively impact your pitch effectiveness.',
      pageNumber: Math.floor(Math.random() * deckPages.length) + 1,
    })),
    ...(data?.improvements || []).map((improvement: any) => ({
      type: 'improvement' as const,
      priority: improvement.priority,
      title: improvement.issue,
      description: improvement.impact,
      pageNumber: improvement.pageNumber || Math.floor(Math.random() * deckPages.length) + 1,
    }))
  ];

  const currentPageIssues = selectedPage === 0
    ? allIssues
    : allIssues.filter(issue => issue.pageNumber === selectedPage);

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Improve & Fix Issues</h1>
          <p className="text-slate-600">Review each slide and apply recommended improvements</p>
        </div>

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
                  <span className="text-sm opacity-90">{allIssues.length} items</span>
                </div>
              </button>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {deckPages.map((page: any) => (
                  <DeckPageCard
                    key={page.pageNumber}
                    page={page}
                    isSelected={selectedPage === page.pageNumber}
                    issueCount={allIssues.filter(i => i.pageNumber === page.pageNumber).length}
                    onClick={() => setSelectedPage(page.pageNumber)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Issues & Recommendations */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedPage === 0 ? 'All Issues & Recommendations' : `Slide ${selectedPage} Issues`}
                </h2>
                <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {currentPageIssues.length} items
                </span>
              </div>

              {currentPageIssues.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Looking Great!</h3>
                  <p className="text-slate-600">No issues found for this slide</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentPageIssues.map((issue, index) => (
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
