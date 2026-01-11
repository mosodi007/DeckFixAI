import { X, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { UpgradePreview, formatCurrency, formatDate } from '../services/upgradeService';

interface UpgradePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  preview: UpgradePreview | null;
  loading: boolean;
}

export function UpgradePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  loading,
}: UpgradePreviewModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {preview?.isDowngrade ? 'Confirm Downgrade' : 'Confirm Upgrade'}
              </h3>
              <p className="text-sm text-slate-600">Review your plan change</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : preview?.isDowngrade ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Downgrade Notice</h4>
                    <p className="text-sm text-amber-800">{preview.message}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-500 mb-1">Current</div>
                  <div className="text-xl font-bold text-slate-900">
                    {preview.currentTier.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">credits</div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-500 mb-1">New</div>
                  <div className="text-xl font-bold text-slate-900">
                    {preview.targetTier.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">credits</div>
                </div>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-500 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-900">Charge Today</span>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {formatCurrency(preview.proratedUpgradeCost || 0)}
                </div>
                <div className="text-xs text-blue-700">
                  Prorated for {preview.daysRemaining} of {preview.totalDays} days remaining ({preview.proratedPercentage}%)
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-500 mb-1">Current</div>
                  <div className="text-xl font-bold text-slate-900">
                    {preview.currentTier.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">credits/mo</div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex-1 text-center">
                  <div className="text-xs text-blue-600 mb-1">New</div>
                  <div className="text-xl font-bold text-blue-600">
                    {preview.targetTier.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">credits/mo</div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-900 font-medium">Credit Increase</span>
                  <span className="text-lg font-bold text-green-600">
                    +{(preview.targetTier.credits - preview.currentTier.credits).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base upgrade cost</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(preview.baseUpgradeCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Proration discount</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency((preview.baseUpgradeCost || 0) - (preview.proratedUpgradeCost || 0))}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Next billing date:</span>
                  <span className="font-medium text-slate-900">
                    {preview.nextBillingDate ? formatDate(preview.nextBillingDate) : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Then{' '}
                  {formatCurrency(
                    preview.billingPeriod === 'annual'
                      ? preview.targetTier.price_annual
                      : preview.targetTier.price_monthly
                  )}{' '}
                  {preview.billingPeriod === 'annual' ? 'annually' : 'monthly'}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Credits available immediately</span> after upgrade
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-medium hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : preview?.isDowngrade ? 'Confirm Downgrade' : 'Confirm Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
