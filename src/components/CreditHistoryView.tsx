import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ShoppingBag, Zap } from 'lucide-react';
import { getCreditHistory, getUserCreditBalance, type CreditTransaction, type UserCredits } from '../services/creditService';

interface CreditHistoryViewProps {
  onBack: () => void;
}

export function CreditHistoryView({ onBack }: CreditHistoryViewProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [history, balance] = await Promise.all([
      getCreditHistory(100, 0),
      getUserCreditBalance(),
    ]);
    setTransactions(history);
    setCredits(balance);
    setLoading(false);
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deduction':
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      case 'purchase':
        return <ShoppingBag className="w-5 h-5 text-green-400" />;
      case 'subscription_renewal':
        return <RefreshCw className="w-5 h-5 text-blue-400" />;
      case 'refund':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      default:
        return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  const getComplexityBadge = (score: number | null) => {
    if (score === null) return null;

    let color = 'bg-green-500/20 text-green-400';
    let label = 'Low';

    if (score > 65) {
      color = 'bg-red-500/20 text-red-400';
      label = 'High';
    } else if (score > 35) {
      color = 'bg-yellow-500/20 text-yellow-400';
      label = 'Medium';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {label} ({score})
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-white">Loading credit history...</div>
        </div>
      </div>
    );
  }

  const totalDeducted = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalAdded = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const avgComplexity = transactions
    .filter(t => t.complexityScore !== null)
    .reduce((sum, t, _, arr) => sum + (t.complexityScore || 0) / arr.length, 0);

  const avgCost = transactions
    .filter(t => t.creditsCost !== null)
    .reduce((sum, t, _, arr) => sum + (t.creditsCost || 0) / arr.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-gray-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Credit History</h1>
          <p className="text-gray-300">Track your credit usage and transactions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-gray-300 text-sm mb-2">Current Balance</div>
            <div className="text-3xl font-bold text-white">{credits?.creditsBalance || 0}</div>
            <div className="text-gray-400 text-xs mt-1">credits</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-gray-300 text-sm mb-2">Total Used</div>
            <div className="text-3xl font-bold text-red-400">{totalDeducted}</div>
            <div className="text-gray-400 text-xs mt-1">credits</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-gray-300 text-sm mb-2">Avg. Complexity</div>
            <div className="text-3xl font-bold text-yellow-400">{avgComplexity.toFixed(0)}</div>
            <div className="text-gray-400 text-xs mt-1">out of 100</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
            <div className="text-gray-300 text-sm mb-2">Avg. Cost/Fix</div>
            <div className="text-3xl font-bold text-purple-400">{avgCost.toFixed(1)}</div>
            <div className="text-gray-400 text-xs mt-1">credits</div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div>{getTransactionIcon(transaction.transactionType)}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-1">
                        {transaction.description}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
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
                        <div className="text-xs text-gray-400 mb-1">Cost</div>
                        <div className="text-lg font-bold text-red-400">
                          {transaction.creditsCost}
                        </div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Change</div>
                      <div
                        className={`text-lg font-bold ${
                          transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-gray-400 mb-1">Balance</div>
                      <div className="text-lg font-bold text-white">
                        {transaction.balanceAfter}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
