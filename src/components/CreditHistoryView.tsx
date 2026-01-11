import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShoppingBag,
  Zap,
  Calendar,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import {
  getCreditHistory,
  getUserCreditBalance,
  getUserSubscription,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  getUserProCreditTier,
  getProCreditTiers,
  getScheduledBillingChange,
  getSubscriptionPeriodEnd,
  type CreditTransaction,
  type UserCredits,
  type UserSubscription,
  type SubscriptionPlan,
  type ProCreditTier
} from '../services/creditService';

interface CreditHistoryViewProps {
  onBack: () => void;
  onViewUsageHistory: () => void;
  onViewPricing: (preselectedTierCredits?: number) => void;
}

export function CreditHistoryView({ onBack, onViewUsageHistory, onViewPricing }: CreditHistoryViewProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [currentProTier, setCurrentProTier] = useState<ProCreditTier | null>(null);
  const [scheduledProTier, setScheduledProTier] = useState<ProCreditTier | null>(null);
  const [scheduledChangeDate, setScheduledChangeDate] = useState<number | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [allProTiers, setAllProTiers] = useState<ProCreditTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [history, balance, userSub, plans, proTiers, proTier, scheduledChange, subPeriodEnd] = await Promise.all([
      getCreditHistory(100, 0),
      getUserCreditBalance(),
      getUserSubscription(),
      getSubscriptionPlans(),
      getProCreditTiers(),
      getUserProCreditTier(),
      getScheduledBillingChange(),
      getSubscriptionPeriodEnd(),
    ]);

    setTransactions(history);
    setCredits(balance);
    setSubscription(userSub);
    setAllPlans(plans);
    setAllProTiers(proTiers);
    setCurrentProTier(proTier);
    setScheduledProTier(scheduledChange?.scheduledTier || null);
    setScheduledChangeDate(scheduledChange?.scheduledChangeDate || null);
    setPeriodEnd(subPeriodEnd);

    if (userSub) {
      const plan = await getSubscriptionPlanById(userSub.planId);
      setCurrentPlan(plan);
    } else if (balance) {
      const freePlan = plans.find(p => p.name === 'Free');
      setCurrentPlan(freePlan || null);
    }

    setLoading(false);
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deduction':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-green-600" />;
      case 'subscription_renewal':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      case 'refund':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      default:
        return <Zap className="w-5 h-5 text-slate-600" />;
    }
  };

  const getComplexityBadge = (score: number | null) => {
    if (score === null) return null;

    let color = 'bg-green-100 text-green-700 border-green-200';
    let label = 'Low';

    if (score > 65) {
      color = 'bg-red-100 text-red-700 border-red-200';
      label = 'High';
    } else if (score > 35) {
      color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
      label = 'Medium';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${color}`}>
        {label} ({score})
      </span>
    );
  };

  const getTierBadgeColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'free':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'starter':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getNextTier = (): ProCreditTier | null => {
    if (allProTiers.length === 0) return null;

    if (!currentProTier) {
      return allProTiers[0] || null;
    }

    const currentCredits = currentProTier.credits;
    const nextTier = allProTiers.find(tier => tier.credits > currentCredits);

    return nextTier || null;
  };

  const calculateCreditUsage = () => {
    if (!credits) return { used: 0, total: 0, percentage: 0 };

    const monthlyTotal = currentProTier ? currentProTier.credits : (currentPlan?.monthlyCredits || 0);
    const used = monthlyTotal - credits.subscriptionCredits;
    const percentage = monthlyTotal > 0 ? (used / monthlyTotal) * 100 : 0;

    return { used: Math.max(0, used), total: monthlyTotal, percentage: Math.min(100, Math.max(0, percentage)) };
  };

  const getPlanDisplayName = () => {
    if (currentProTier) {
      return `Pro - ${currentProTier.credits.toLocaleString()} Credits`;
    }
    return currentPlan?.name || 'Free';
  };

  const getMonthlyCredits = () => {
    if (currentProTier) {
      return currentProTier.credits;
    }
    return currentPlan?.monthlyCredits || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-slate-600">Loading subscription details...</div>
        </div>
      </div>
    );
  }

  const nextTier = getNextTier();
  const creditUsage = calculateCreditUsage();
  const nextRefillDate = periodEnd
    ? periodEnd.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  const isDowngrade = scheduledProTier && currentProTier && scheduledProTier.credits < currentProTier.credits;
  const isUpgrade = scheduledProTier && currentProTier && scheduledProTier.credits > currentProTier.credits;

  const totalDeducted = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-10">
          <h1 className="text-5xl font-semibold text-slate-900 mb-2 tracking-tighter">
            My Subscription & Credits
          </h1>
          <p className="text-slate-600 text-lg">Manage your plan, credits, and billing</p>
        </div>

        {/* Main Subscription Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden mb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
            <div className="flex items-start justify-between gap-8 mb-6">
              <div className="flex-1">
                <div className="text-slate-300 text-sm mb-2 font-medium">Credit Balance</div>
                <div className="text-6xl font-bold mb-2">{credits?.creditsBalance || 0}</div>
                <div className="text-slate-300 text-base mb-6">credits available</div>

                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getTierBadgeColor(currentProTier ? 'Pro' : (currentPlan?.name || 'Free'))}`}>
                    {getPlanDisplayName()} Plan
                  </span>
                  {subscription?.cancelAtPeriodEnd && (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      Canceling
                    </span>
                  )}
                </div>
                <div className="text-slate-300 text-sm">
                  {getMonthlyCredits().toLocaleString()} credits/month
                  {subscription && <span className="text-slate-400"> • Billed {subscription.billingPeriod}</span>}
                </div>
                {scheduledProTier && scheduledChangeDate && (
                  <div className="mt-3 px-3 py-2 bg-amber-500/20 border border-amber-400/30 rounded-lg">
                    <p className="text-sm text-amber-200 font-medium">
                      {isDowngrade ? 'Scheduled downgrade' : isUpgrade ? 'Scheduled upgrade' : 'Scheduled change'} to {scheduledProTier.credits.toLocaleString()} credits/month from{' '}
                      {new Date(scheduledChangeDate * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side: Upgrade Promo or Manage Plan */}
              <div className="flex-shrink-0">
                {(() => {
                  const nextAvailableTier = getNextTier();
                  if (currentProTier && nextAvailableTier) {
                    return (
                      <button
                        onClick={() => onViewPricing(nextAvailableTier.credits)}
                        className="group bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl p-5 shadow-xl transition-all hover:shadow-2xl hover:scale-105 min-w-[260px]"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-xs font-semibold text-blue-100 mb-1">Get more from Pro</div>
                            <div className="text-base font-bold">Upgrade to {nextAvailableTier.credits.toLocaleString()}</div>
                            <div className="text-xs text-white/90">Credits Plan</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-white/20">
                          <span className="text-xs font-medium text-white/90">View pricing</span>
                          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  } else if (currentProTier) {
                    return (
                      <button
                        onClick={() => onViewPricing()}
                        className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all shadow-lg flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Manage Plan
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => onViewPricing()}
                        className="px-5 py-2.5 bg-white text-black rounded-xl font-semibold hover:bg-slate-100 transition-all shadow-lg flex items-center gap-2"
                      >
                        Upgrade to Pro
                      </button>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Credit Usage Bar */}
            <div className="border-t border-slate-600 pt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-300">Monthly Credit Usage</span>
                <span className="text-white font-semibold">
                  {creditUsage.used} / {creditUsage.total}
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${creditUsage.percentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {creditUsage.percentage.toFixed(0)}% used this month
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            {/* Next Refill & Usage History */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 text-sm mb-2 font-medium">Next Credit Refill</div>
                  <div className="text-2xl font-bold text-slate-900">{nextRefillDate}</div>
                </div>
                <button
                  onClick={onViewUsageHistory}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  View Usage History
                </button>
              </div>
            </div>

            {/* Credit Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-slate-600 text-xs mb-1 font-medium">From Plan</div>
                <div className="text-2xl font-bold text-blue-600">{credits?.subscriptionCredits || 0}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-slate-600 text-xs mb-1 font-medium">Purchased</div>
                <div className="text-2xl font-bold text-green-600">{credits?.purchasedCredits || 0}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!currentProTier && (
                <button
                  onClick={() => onViewPricing()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Upgrade to Pro</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              )}

              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="w-full px-6 py-4 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Credit Transactions
                {showTransactions ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Period Info */}
            {subscription && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Current billing period</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )}

            {/* See All Plans Link */}
            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <button
                onClick={() => onViewPricing()}
                className="text-slate-700 hover:text-slate-900 font-semibold text-sm transition-colors flex items-center justify-center gap-2 mx-auto group"
              >
                <span>See all available plans</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History - Collapsible */}
        {showTransactions && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Transaction History</h2>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Last 100 transactions</span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No transactions yet</p>
                <p className="text-slate-500 text-sm mt-1">Your credit activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        {getTransactionIcon(transaction.transactionType)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 mb-1">
                          {transaction.description}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span>
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {transaction.complexityScore !== null && (
                            <span className="flex items-center gap-2">
                              {getComplexityBadge(transaction.complexityScore)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {transaction.creditsCost && (
                        <div className="text-center">
                          <div className="text-xs text-slate-500 mb-1 font-medium">Cost</div>
                          <div className="text-lg font-bold text-red-600">
                            {transaction.creditsCost}
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1 font-medium">Change</div>
                        <div
                          className={`text-lg font-bold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </div>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <div className="text-xs text-slate-500 mb-1 font-medium">Balance</div>
                        <div className="text-lg font-bold text-slate-900">
                          {transaction.balanceAfter}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
