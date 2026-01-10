import { X, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

interface Page {
  page_number: number;
  title: string;
  score: number;
  content: string | null;
  feedback: string | null;
  recommendations: string[] | null;
  ideal_version: string | null;
  image_url: string | null;
}

interface SlideFeedbackModalProps {
  page: Page;
  onClose: () => void;
}

export function SlideFeedbackModal({ page, onClose }: SlideFeedbackModalProps) {
  const getScoreColor = (score: number) => {
    const normalizedScore = score / 10;
    if (normalizedScore >= 8.5) return 'text-green-400';
    if (normalizedScore >= 7) return 'text-yellow-400';
    if (normalizedScore >= 5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    const normalizedScore = score / 10;
    if (normalizedScore >= 8.5) return 'bg-green-500/20 border-green-500/30';
    if (normalizedScore >= 7) return 'bg-yellow-500/20 border-yellow-500/30';
    if (normalizedScore >= 5) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-start justify-between p-6 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Slide {page.page_number}: {page.title}
            </h2>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg border ${getScoreBg(page.score)}`}>
                <span className="text-sm text-white/70">Score: </span>
                <span className={`text-xl font-bold ${getScoreColor(page.score)}`}>
                  {(page.score / 10).toFixed(1)}/10
                </span>
              </div>
              {page.score < 85 && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">Needs Improvement</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white/70" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {page.image_url && (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={page.image_url}
                alt={`Slide ${page.page_number}`}
                className="w-full"
              />
            </div>
          )}

          {page.feedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-semibold text-white">Brutal VC Feedback</h3>
              </div>
              <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="prose prose-invert max-w-none">
                  {page.feedback.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-white/90 leading-relaxed mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {page.recommendations && page.recommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Actionable Fixes</h3>
              </div>
              <div className="space-y-3">
                {page.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold text-sm mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-white/90 leading-relaxed flex-1">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page.ideal_version && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Perfect Slide Blueprint</h3>
              </div>
              <div className="p-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-white/90 leading-relaxed">{page.ideal_version}</p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/10">
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}