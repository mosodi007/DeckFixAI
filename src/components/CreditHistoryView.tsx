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
  type CreditTransaction,
  type UserCredits,
  type UserSubscription,
  type SubscriptionPlan
} from '../services/creditService';

interface CreditHistoryViewProps {
  onBack: () => void;
}

export function CreditHistoryView({ onBack }: CreditHistoryViewProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [history, balance, userSub, plans] = await Promise.all([
      getCreditHistory(100, 0),
      getUserCreditBalance(),
      getUserSubscription(),
      getSubscriptionPlans(),
    ]);

    setTransactions(history);
    setCredits(balance);
    setSubscription(userSub);
    setAllPlans(plans);

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

  const getNextTier = (): SubscriptionPlan | null => {
    if (!currentPlan) return null;

    const tierOrder = ['Free', 'Starter', 'Pro'];
    const currentIndex = tierOrder.indexOf(currentPlan.name);

    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }

    return allPlans.find(p => p.name === tierOrder[currentIndex + 1]) || null;
  };

  const calculateCreditUsage = () => {
    if (!credits || !currentPlan) return { used: 0, total: 0, percentage: 0 };

    const monthlyTotal = currentPlan.monthlyCredits;
    const used = monthlyTotal - credits.subscriptionCredits;
    const percentage = monthlyTotal > 0 ? (used / monthlyTotal) * 100 : 0;

    return { used: Math.max(0, used), total: monthlyTotal, percentage: Math.min(100, Math.max(0, percentage)) };
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
  const nextRefillDate = credits?.creditsResetDate
    ? new Date(credits.creditsResetDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : 'N/A';

  const totalDeducted = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-5xl font-semibold text-slate-900 mb-2 tracking-tighter">
            My Subscription & Credits
          </h1>
          <p className="text-slate-600 text-lg">Manage your plan, credits, and billing</p>
        </div>

        {/* Credit Balance & Subscription Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Credit Balance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-slate-300 text-sm mb-2 font-medium">Credit Balance</div>
                <div className="text-6xl font-bold mb-2">{credits?.creditsBalance || 0}</div>
                <div className="text-slate-300 text-sm">credits available</div>
              </div>
              <button
                className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all shadow-lg flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Top Up
              </button>
            </div>

            <div className="border-t border-slate-600 pt-6 mb-6">
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

            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Next credit refill: <strong className="text-white">{nextRefillDate}</strong></span>
            </div>
          </div>

          {/* Subscription Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-slate-600 text-sm mb-3 font-medium">Current Plan</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-4 py-2 rounded-xl text-lg font-bold border-2 ${getTierBadgeColor(currentPlan?.name || 'Free')}`}>
                    {currentPlan?.name || 'Free'}
                  </span>
                  {subscription?.cancelAtPeriodEnd && (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                      Canceling
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {currentPlan?.monthlyCredits || 0} credits/month
                </div>
                {subscription && (
                  <div className="text-sm text-slate-600">
                    Billed {subscription.billingPeriod}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-4">
              <button
                className="w-full px-5 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Billing
              </button>

              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="w-full px-5 py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Credit Usage
                {showTransactions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {subscription && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Current Period:</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Promotion - Only show if not on Pro tier */}
        {nextTier && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-8 mb-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-900">
                    Get more out of DeckFix, Upgrade to {nextTier.name}
                  </h2>
                </div>
                <p className="text-slate-700 mb-4">
                  Unlock {nextTier.monthlyCredits} credits per month and access premium features
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {nextTier.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-slate-900">
                    ${nextTier.priceMonthly.toFixed(2)}
                  </span>
                  <span className="text-slate-600">/month</span>
                  <span className="ml-2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    Save 20% annually
                  </span>
                </div>
              </div>
              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 ml-4">
                Upgrade Now
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Subscription Credits</div>
            <div className="text-3xl font-bold text-blue-600">{credits?.subscriptionCredits || 0}</div>
            <div className="text-slate-500 text-xs mt-1">from monthly plan</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Purchased Credits</div>
            <div className="text-3xl font-bold text-green-600">{credits?.purchasedCredits || 0}</div>
            <div className="text-slate-500 text-xs mt-1">one-time purchases</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Total Spent</div>
            <div className="text-3xl font-bold text-red-600">{totalDeducted}</div>
            <div className="text-slate-500 text-xs mt-1">credits used all-time</div>
          </div>
        </div>

        {/* Transaction History - Collapsible */}
        {showTransactions && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in">
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
