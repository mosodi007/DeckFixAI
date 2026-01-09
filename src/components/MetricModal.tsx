import { X, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

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
  color,
  breakdown
}: MetricModalProps) {
  if (!isOpen) return null;

  const percentage = (score / max) * 100;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    cyan: 'from-cyan-500 to-cyan-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'poor') => {
    if (status === 'good') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusBg = (status: 'good' | 'warning' | 'poor') => {
    if (status === 'good') return 'bg-green-50 border-green-200';
    if (status === 'warning') return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 text-white`}>
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
              <div className="w-full bg-white bg-opacity-30 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-sm mt-2 opacity-90">{percentage.toFixed(0)}% of maximum score</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Detailed Breakdown</h3>
          </div>

          <div className="space-y-3">
            {breakdown.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusBg(item.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{item.category}</h4>
                      <span className="text-sm font-bold text-slate-700">{item.score}/10</span>
                    </div>
                    <p className="text-sm text-slate-700">{item.feedback}</p>
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
