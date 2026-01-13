import { X, CreditCard, Gift, AlertCircle } from 'lucide-react';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  requiredCredits: number;
  onUpgrade: () => void;
  onEarnCredits: () => void;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  currentBalance,
  requiredCredits,
  onUpgrade,
  onEarnCredits,
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null;

  const creditsNeeded = requiredCredits - currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">
                  Insufficient Credits
                </h3>
                <p className="text-sm text-slate-600">
                  You don't have enough credits to complete this action
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Current Balance</span>
                <span className="text-2xl font-bold text-slate-900">{currentBalance}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Credits Required</span>
                <span className="text-2xl font-bold text-amber-600">{requiredCredits}</span>
              </div>
              <div className="border-t border-slate-200 mt-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">You Need</span>
                  <span className="text-xl font-bold text-red-600">{creditsNeeded} more credits</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Get more credits</span> by upgrading to Pro or referring friends to earn free credits.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
            >
              <CreditCard className="w-5 h-5" />
              Upgrade to Pro
            </button>

            <button
              onClick={() => {
                onEarnCredits();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 transition-colors py-2"
            >
              <Gift className="w-4 h-4" />
              <span className="text-sm font-medium">Earn free 50 credits</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
