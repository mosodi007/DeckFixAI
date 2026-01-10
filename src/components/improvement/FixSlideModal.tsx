import { X, Copy, CheckCircle, Sparkles, TrendingUp, Image as ImageIcon, ListOrdered, Lightbulb, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { GeneratedFix, markFixAsApplied } from '../../services/aiFixService';

interface FixSlideModalProps {
  fix: GeneratedFix;
  fixId: string;
  slideTitle: string;
  slideNumber: number;
  currentScore: number;
  onClose: () => void;
  onMarkApplied?: () => void;
}

export function FixSlideModal({
  fix,
  fixId,
  slideTitle,
  slideNumber,
  currentScore,
  onClose,
  onMarkApplied
}: FixSlideModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleMarkAsApplied = async () => {
    setIsApplying(true);
    const success = await markFixAsApplied(fixId);
    setIsApplying(false);

    if (success && onMarkApplied) {
      onMarkApplied();
      setTimeout(() => onClose(), 1000);
    }
  };

  const newScore = Math.min(10, currentScore + fix.estimatedScoreImprovement);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between p-6 border-b border-slate-200 bg-white">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Expert Fix for Slide {slideNumber}
              </h2>
            </div>
            <p className="text-slate-600">{slideTitle}</p>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Current Score:</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm">
                  {currentScore.toFixed(1)}/10
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">After Fix:</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-sm">
                  {newScore.toFixed(1)}/10
                </span>
              </div>
              <div className="flex items-center gap-1 text-green-600 ml-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold text-sm">+{fix.estimatedScoreImprovement.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-5">
            <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Issue Identified: {fix.issueType}
            </h3>
            <p className="text-red-800 text-sm leading-relaxed">
              {fix.issueDescription}
            </p>
          </div>

          <div className="bg-[#F3F3F3] border border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                Why This Fix Works
              </h3>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {fix.explanation}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">
                Before
              </h4>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-600 text-sm italic whitespace-pre-wrap">
                  {fix.beforeExample}
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">
                After (Use This)
              </h4>
              <div className="bg-white border border-green-300 rounded-lg p-4">
                <p className="text-slate-900 text-sm font-medium whitespace-pre-wrap">
                  {fix.afterExample}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-green-500 rounded-xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Copy className="w-5 h-5 text-green-600" />
                Exact Replacement Text
              </h3>
              <button
                onClick={() => handleCopy(fix.exactReplacementText, 'replacement')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-sm"
              >
                {copiedSection === 'replacement' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Text
                  </>
                )}
              </button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-slate-900 leading-relaxed whitespace-pre-wrap font-medium">
                {fix.exactReplacementText}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Copy this text and paste it directly into your slide. This is production-ready content.
            </p>
          </div>

          {fix.visualRecommendations && fix.visualRecommendations.length > 0 && (
            <div className="border rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#000]" />
                Visual Elements to Add
              </h3>
              <div className="space-y-3">
                {fix.visualRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-white border rounded-lg p-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-[#000]" />
                    </div>
                    <p className="text-slate-700 flex-1">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-blue-600" />
              Step-by-Step Implementation
            </h3>
            <div className="space-y-3">
              {fix.implementationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 bg-white border border-blue-200 rounded-lg p-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-slate-700 flex-1 pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleMarkAsApplied}
              disabled={isApplying}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#000] hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Marking as Applied...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Mark as Applied
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
