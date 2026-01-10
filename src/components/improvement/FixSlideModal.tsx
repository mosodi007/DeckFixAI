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
  isDeckWideIssue?: boolean;
}

function formatText(text: string) {
  return text
    .split('\n')
    .map((line, idx) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('- ')) {
        const content = formatInlineMarkdown(trimmedLine.substring(2));
        return (
          <li key={idx} className="ml-4">
            {content}
          </li>
        );
      }

      if (trimmedLine) {
        return <p key={idx}>{formatInlineMarkdown(trimmedLine)}</p>;
      }

      return <br key={idx} />;
    });
}

function formatInlineMarkdown(text: string) {
  const parts: (string | JSX.Element)[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      if (currentText) {
        parts.push(currentText);
        currentText = '';
      }

      i += 2;
      let boldText = '';
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
        boldText += text[i];
        i++;
      }

      if (i < text.length) {
        parts.push(<strong key={parts.length} className="font-bold">{boldText}</strong>);
        i += 2;
      } else {
        currentText += '**' + boldText;
      }
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    parts.push(currentText);
  }

  return parts.length > 0 ? parts : text;
}

export function FixSlideModal({
  fix,
  fixId,
  slideTitle,
  slideNumber,
  currentScore,
  onClose,
  onMarkApplied,
  isDeckWideIssue = false
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
                {isDeckWideIssue ? 'Expert Fix for Deck Issue' : `Expert Fix for Slide ${slideNumber}`}
              </h2>
            </div>
            <p className="text-slate-600">{slideTitle}</p>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{isDeckWideIssue ? 'Overall Score:' : 'Current Score:'}</span>
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
            <div className="text-red-800 text-sm leading-relaxed space-y-2">
              {formatText(fix.issueDescription)}
            </div>
          </div>

          <div className="bg-slate-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                Why This Works
              </h3>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-2">
              {formatText(fix.explanation)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">
                Before
              </h4>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-slate-600 text-sm italic space-y-2">
                  {formatText(fix.beforeExample)}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-green-200 rounded-xl p-5">
              <h4 className="font-bold text-green-900 mb-3 text-sm uppercase tracking-wide">
                After (Use This)
              </h4>
              <div className="bg-white border border-green-300 rounded-lg p-4">
                <div className="text-slate-900 text-sm font-medium space-y-2">
                  {formatText(fix.afterExample)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-50 rounded-xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Copy className="w-5 h-5 text-green-600" />
                Exact Replacement Text
              </h3>
              <button
                onClick={() => handleCopy(fix.exactReplacementText, 'replacement')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-sm"
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
            <div className="bg-slate-50 border rounded-lg p-4">
              <div className="text-slate-900 leading-relaxed font-medium space-y-2">
                {formatText(fix.exactReplacementText)}
              </div>
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
                    <div className="text-slate-700 flex-1 space-y-1">
                      {formatText(rec)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              Step-by-Step Implementation
            </h3>
            <div className="space-y-3">
              {fix.implementationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 bg-white border border-blue-200 rounded-lg p-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="text-slate-700 flex-1 pt-1 space-y-1">
                    {formatText(step)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
