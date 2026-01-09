import { X, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';

interface MetricBreakdown {
  category: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  feedback: string;
}

interface MetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricName: string;
  score: number;
  max: number;
  color: 'blue' | 'cyan' | 'green' | 'purple' | 'orange' | 'pink';
  breakdown: MetricBreakdown[];
}

export function MetricModal({
  isOpen,
  onClose,
  metricName,
  score,
  max,
  breakdown
}: MetricModalProps) {
  if (!isOpen) return null;

  const percentage = (score / max) * 100;

  const getStatusIcon = (status: 'good' | 'warning' | 'poor') => {
    if (status === 'good') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusBg = (status: 'good' | 'warning' | 'poor') => {
    if (status === 'good') return 'bg-white/40 backdrop-blur-md border-green-200';
    if (status === 'warning') return 'bg-white/40 backdrop-blur-md border-yellow-200';
    return 'bg-white/40 backdrop-blur-md border-red-200';
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/80 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{metricName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{score}</span>
              <span className="text-2xl opacity-90">/ {max}</span>
            </div>
            <div className="flex-1">
              <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-3 overflow-hidden">
                <ProgressBar value={score} max={max} height="md" />
              </div>
              <p className="text-sm mt-2 opacity-90">{percentage.toFixed(0)}% of maximum score</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900">Detailed Breakdown</h3>
          </div>

          <div className="space-y-3">
            {breakdown.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${getStatusBg(item.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">{item.category}</h4>
                      <span className="text-sm font-bold text-slate-700">{item.score}/10</span>
                    </div>
                    <ProgressBar value={item.score} max={10} height="sm" />
                    <p className="text-sm text-slate-700 mt-2">{item.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
