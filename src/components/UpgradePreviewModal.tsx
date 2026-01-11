import { X, ArrowUp, Calendar, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <ArrowUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {preview?.isDowngrade ? 'Confirm Downgrade' : 'Confirm Upgrade'}
              </h3>
              <p className="text-sm text-slate-400">Review your plan change details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : preview?.isDowngrade ? (
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-500 mb-1">Downgrade Notice</h4>
                    <p className="text-sm text-slate-300">{preview.message}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-400 mb-1">Current Plan</div>
                  <div className="text-2xl font-bold text-white">
                    {preview.currentTier.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">credits/month</div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="text-sm text-slate-400 mb-1">New Plan</div>
                  <div className="text-2xl font-bold text-white">
                    {preview.targetTier.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">credits/month</div>
                </div>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                  <div className="text-sm text-slate-400 mb-1">Current Plan</div>
                  <div className="text-2xl font-bold text-white">
                    {preview.currentTier.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">credits/month</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-sm text-blue-300 mb-1">New Plan</div>
                  <div className="text-2xl font-bold text-white">
                    {preview.targetTier.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-300">credits/month</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h4 className="font-semibold text-white">Credit Increase</h4>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-1">
                  +{(preview.targetTier.credits - preview.currentTier.credits).toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">additional credits per month</div>
              </div>

              <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <h4 className="font-semibold text-white">Pricing Breakdown</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-400">Base upgrade cost</span>
                    <span className="text-white font-medium">
                      {formatCurrency(preview.baseUpgradeCost || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <div>
                      <div className="text-slate-400">Prorated for remaining period</div>
                      <div className="text-xs text-slate-500">
                        {preview.daysRemaining} of {preview.totalDays} days ({preview.proratedPercentage}%)
                      </div>
                    </div>
                    <span className="text-green-400 font-medium">
                      -{formatCurrency((preview.baseUpgradeCost || 0) - (preview.proratedUpgradeCost || 0))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg px-4 mt-3">
                    <span className="text-white font-semibold text-lg">Charge today</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {formatCurrency(preview.proratedUpgradeCost || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Next billing date</span>
                </div>
                <div className="text-white font-medium">
                  {preview.nextBillingDate ? formatDate(preview.nextBillingDate) : 'N/A'}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  You'll be charged{' '}
                  {formatCurrency(
                    preview.billingPeriod === 'annual'
                      ? preview.targetTier.price_annual
                      : preview.targetTier.price_monthly
                  )}{' '}
                  {preview.billingPeriod === 'annual' ? 'annually' : 'monthly'}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="text-blue-400 text-2xl">✨</div>
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Immediate Access</h4>
                    <p className="text-sm text-slate-300">
                      Your new credits will be available immediately after confirming this upgrade.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700/50 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : preview?.isDowngrade ? 'Confirm Downgrade' : 'Confirm Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}
