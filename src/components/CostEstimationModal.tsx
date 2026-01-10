import { X, AlertCircle, Zap, TrendingUp, Info } from 'lucide-react';

interface CostEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimatedCost: number;
  complexityScore: number;
  complexityLevel: 'low' | 'medium' | 'high';
  explanation: string;
  currentBalance: number;
}

export function CostEstimationModal({
  isOpen,
  onClose,
  onConfirm,
  estimatedCost,
  complexityScore,
  complexityLevel,
  explanation,
  currentBalance,
}: CostEstimationModalProps) {
  if (!isOpen) return null;

  const hasEnoughCredits = currentBalance >= estimatedCost;
  const balanceAfter = currentBalance - estimatedCost;

  const complexityColors = {
    low: 'text-green-700 bg-green-100 border-green-200',
    medium: 'text-yellow-700 bg-yellow-100 border-yellow-200',
    high: 'text-red-700 bg-red-100 border-red-200',
  };

  const complexityIcons = {
    low: <Zap className="w-5 h-5" />,
    medium: <Zap className="w-5 h-5" />,
    high: <Zap className="w-5 h-5" />,
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Confirm Fix Generation</h2>
            <p className="text-slate-600 text-sm mt-1">Review the estimated cost before proceeding</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-600 font-medium">Estimated Cost</span>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-slate-900">{estimatedCost}</span>
                <span className="text-slate-600">credits</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-200">
              <span className="text-slate-600 font-medium">Complexity Level</span>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${complexityColors[complexityLevel]}`}>
                {complexityIcons[complexityLevel]}
                <span className="font-semibold capitalize">{complexityLevel}</span>
              </div>
            </div>

            <div className="py-3 border-t border-slate-200">
              <div className="text-slate-600 mb-2 font-medium">Complexity Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      complexityLevel === 'low'
                        ? 'bg-green-500'
                        : complexityLevel === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${complexityScore}%` }}
                  />
                </div>
                <span className="text-slate-900 font-semibold">{complexityScore}/100</span>
              </div>
            </div>

            <div className="py-3 border-t border-slate-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">{explanation}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 font-medium">Current Balance</span>
              <span className="text-slate-900 font-semibold">{currentBalance} credits</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 font-medium">After Generation</span>
              <span className={`font-semibold ${balanceAfter < 20 ? 'text-yellow-600' : 'text-slate-900'}`}>
                {balanceAfter} credits
              </span>
            </div>
            {balanceAfter < 20 && balanceAfter >= 0 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Your balance will be low after this. Consider adding more credits.
                </p>
              </div>
            )}
          </div>

          {!hasEnoughCredits && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-900 font-semibold mb-1">Insufficient Credits</p>
                  <p className="text-red-700 text-sm">
                    You need {estimatedCost - currentBalance} more credits to generate this fix.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {hasEnoughCredits ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-all border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  Generate Fix
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-all border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Add Credits
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
