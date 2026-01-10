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
    low: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-red-400 bg-red-500/20',
  };

  const complexityIcons = {
    low: <Zap className="w-5 h-5" />,
    medium: <Zap className="w-5 h-5" />,
    high: <Zap className="w-5 h-5" />,
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-purple-500/30 max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Confirm Fix Generation</h2>
            <p className="text-gray-400 text-sm mt-1">Review the estimated cost before proceeding</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-purple-900/30 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300">Estimated Cost</span>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-white">{estimatedCost}</span>
                <span className="text-gray-400">credits</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-white/10">
              <span className="text-gray-300">Complexity Level</span>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${complexityColors[complexityLevel]}`}>
                {complexityIcons[complexityLevel]}
                <span className="font-semibold capitalize">{complexityLevel}</span>
              </div>
            </div>

            <div className="py-3 border-t border-white/10">
              <div className="text-gray-300 mb-2">Complexity Score</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      complexityLevel === 'low'
                        ? 'bg-green-400'
                        : complexityLevel === 'medium'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`}
                    style={{ width: `${complexityScore}%` }}
                  />
                </div>
                <span className="text-white font-semibold">{complexityScore}/100</span>
              </div>
            </div>

            <div className="py-3 border-t border-white/10">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">{explanation}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Current Balance</span>
              <span className="text-white font-semibold">{currentBalance} credits</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">After Generation</span>
              <span className={`font-semibold ${balanceAfter < 20 ? 'text-yellow-400' : 'text-white'}`}>
                {balanceAfter} credits
              </span>
            </div>
            {balanceAfter < 20 && balanceAfter >= 0 && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-200">
                  Your balance will be low after this. Consider adding more credits.
                </p>
              </div>
            )}
          </div>

          {!hasEnoughCredits && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-200 font-semibold mb-1">Insufficient Credits</p>
                  <p className="text-red-300 text-sm">
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
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  Generate Fix
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
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
