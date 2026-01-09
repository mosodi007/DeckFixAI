import { X, LucideIcon } from 'lucide-react';

interface VCCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  score: number;
  feedback: string;
  icon: LucideIcon;
  color: string;
}

export function VCCriteriaModal({ isOpen, onClose, title, score, feedback, icon: Icon, color }: VCCriteriaModalProps) {
  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Fair';
    if (score >= 3) return 'Weak';
    return 'Critical';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-slate-100 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                  {score.toFixed(1)}/10
                </span>
                <span className={`text-sm font-semibold px-2 py-1 rounded ${
                  score >= 7 ? 'bg-green-100 text-green-700' :
                  score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {getScoreLabel(score)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="prose prose-slate max-w-none">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Detailed Assessment</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {feedback || 'No detailed feedback available for this criterion.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
