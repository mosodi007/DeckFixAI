import { useState } from 'react';
import { ArrowLeft, Filter, Sparkles } from 'lucide-react';
import { DeckPageCard } from './improvement/DeckPageCard';
import { IssueCard } from './improvement/IssueCard';
import { SlideViewer } from './improvement/SlideViewer';
import { SlideFeedbackModal } from './improvement/SlideFeedbackModal';
import { FixSlideModal } from './improvement/FixSlideModal';
import { generateSlideFix, GeneratedFix } from '../services/aiFixService';

interface ImprovementFlowViewProps {
  data: any;
  onBack: () => void;
  isAnalyzing?: boolean;
}

export function ImprovementFlowView({ data, onBack, isAnalyzing = false }: ImprovementFlowViewProps) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [feedbackModalPage, setFeedbackModalPage] = useState<any | null>(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);
  const [generatedFix, setGeneratedFix] = useState<{ fix: GeneratedFix; fixId: string } | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const deckPages = data?.pages || Array.from({ length: 10 }, (_, i) => ({
    page_number: i + 1,
    title: `Slide ${i + 1}`,
    score: Math.floor(Math.random() * 40) + 60,
    content: null,
    feedback: null,
    recommendations: null,
    ideal_version: null,
    thumbnail: null,
    image_url: null
  }));

  const allIssues = [
    ...(data?.dealBreakers || [])
      .filter((breaker: any) => breaker.title && breaker.description)
      .map((breaker: any) => ({
        type: 'deal_breaker' as const,
        priority: 'high',
        title: breaker.title,
        description: breaker.description,
        recommendation: breaker.recommendation,
        pageNumber: null,
        impact: 'This is a critical issue that makes the deck uninvestable. Must be fixed before approaching investors.',
      })),
    ...(data?.redFlags || [])
      .filter((flag: any) => flag.title && flag.description)
      .map((flag: any) => ({
        type: 'red_flag' as const,
        priority: flag.severity === 'critical' ? 'high' : flag.severity === 'major' ? 'medium' : 'low',
        title: flag.title,
        description: flag.description,
        impact: flag.impact,
        category: flag.category,
        severity: flag.severity,
        pageNumber: null,
      })),
    ...(data?.missingSlides || [])
      .filter((slide: any) => slide.title && slide.description)
      .map((slide: any) => ({
        type: 'missing_slide' as const,
        priority: slide.priority,
        title: slide.title,
        description: slide.description,
        suggestedContent: slide.suggestedContent,
        pageNumber: null,
      }))
  ];

  const sortedIssues = [...allIssues].sort((a, b) => {
    const typeOrder = { deal_breaker: 0, red_flag: 1, missing_slide: 2 };
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
    missing_slide: sortedIssues.filter(i => i.type === 'missing_slide').length,
  };

  const handleGenerateFix = async () => {
    if (selectedPage === 0 || !data?.id) return;

    const currentPage = deckPages.find((p: any) => p.page_number === selectedPage);
    if (!currentPage) return;

    setIsGeneratingFix(true);
    setFixError(null);

    try {
      const result = await generateSlideFix(
        data.id,
        currentPage.page_number,
        currentPage.title,
        currentPage.score,
        currentPage.content,
        currentPage.feedback,
        currentPage.recommendations,
        currentPage.image_url
      );

      if (result.success && result.fix && result.fixId) {
        setGeneratedFix({ fix: result.fix, fixId: result.fixId });
        setShowFixModal(true);
      } else {
        setFixError(result.error || 'Failed to generate fix');
      }
    } catch (error) {
      console.error('Error generating fix:', error);
      setFixError('An unexpected error occurred');
    } finally {
      setIsGeneratingFix(false);
    }
  };

  const handleCloseFixModal = () => {
    setShowFixModal(false);
    setGeneratedFix(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Analyzing all Issues in your Pitch Deck
              </h3>
              <p className="text-slate-600 mb-2">
                Using DeckFix AI Vision to provide in-depth analysis and recommendations for each slide...
              </p>
              <p className="text-sm text-slate-500">
                This may take a minute
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Analysis</span>
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Fix Issues</h1>
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
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                {data?.keyMetrics?.company && data.keyMetrics.company !== 'Not specified'
                  ? data.keyMetrics.company
                  : data?.fileName?.replace('.pdf', '') || 'Deck Pages'}
              </h2>

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
                    key={page.page_number}
                    page={{
                      pageNumber: page.page_number,
                      title: page.title,
                      score: page.score,
                      thumbnail: page.thumbnail
                    }}
                    isSelected={selectedPage === page.page_number}
                    issueCount={sortedIssues.filter(i => i.pageNumber === page.page_number).length}
                    onClick={() => setSelectedPage(page.page_number)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Slide Viewer & Issues */}
          <div className="lg:col-span-8 space-y-6">
            {selectedPage > 0 && (
              <SlideViewer
                slideNumber={selectedPage}
                imageUrl={deckPages.find((p: any) => p.page_number === selectedPage)?.image_url}
                title={deckPages.find((p: any) => p.page_number === selectedPage)?.title || `Slide ${selectedPage}`}
                score={deckPages.find((p: any) => p.page_number === selectedPage)?.score || 0}
              />
            )}

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedPage === 0 ? 'All Issues & Recommendations' : `Slide ${selectedPage} - Feedback & Recommendations`}
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
                  </select>
                </div>
              </div>

              {selectedPage > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                        DeckFixAI can fix this for you.
                      </h3>
                      <p className="text-sm text-slate-600">
                        Get implementation-ready fixes from our AI pitch deck expert to bring this slide to 10/10
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateFix}
                      disabled={isGeneratingFix}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isGeneratingFix ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Fix This
                        </>
                      )}
                    </button>
                  </div>
                  {fixError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{fixError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Slide-Specific Feedback and Recommendations */}
              {selectedPage > 0 && (() => {
                const currentSlide = deckPages.find((p: any) => p.page_number === selectedPage);
                const hasFeedback = currentSlide?.feedback && currentSlide.feedback.trim();
                const hasRecommendations = currentSlide?.recommendations && currentSlide.recommendations.length > 0;

                if (hasFeedback || hasRecommendations) {
                  return (
                    <div className="space-y-4 mb-6">
                      {hasFeedback && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                          <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase tracking-wide">
                            AI Feedback
                          </h3>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {currentSlide.feedback}
                          </p>
                        </div>
                      )}

                      {hasRecommendations && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                          <h3 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">
                            Recommendations
                          </h3>
                          <ul className="space-y-2">
                            {currentSlide.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-700 flex-1">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Issues from aggregated data */}
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8">
                </div>
              ) : (
                <div>
                  {selectedPage === 0 && (
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase tracking-wide">
                        Critical Deck-Level Issues
                      </h3>
                      <p className="text-sm text-slate-600 mb-4">
                        These issues affect your entire deck. For slide-specific feedback and AI-powered fixes, click on individual slides.
                      </p>
                    </div>
                  )}
                  {selectedPage > 0 && (
                    <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">
                      Additional Issues
                    </h3>
                  )}
                  <div className="space-y-4">
                    {filteredIssues.map((issue, index) => (
                      <IssueCard
                        key={index}
                        issue={issue}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {feedbackModalPage && (
        <SlideFeedbackModal
          page={feedbackModalPage}
          onClose={() => setFeedbackModalPage(null)}
        />
      )}

      {showFixModal && generatedFix && (
        <FixSlideModal
          fix={generatedFix.fix}
          fixId={generatedFix.fixId}
          slideTitle={deckPages.find((p: any) => p.page_number === selectedPage)?.title || `Slide ${selectedPage}`}
          slideNumber={selectedPage}
          currentScore={deckPages.find((p: any) => p.page_number === selectedPage)?.score / 10 || 0}
          onClose={handleCloseFixModal}
          onMarkApplied={() => {}}
        />
      )}
    </div>
  );
}
