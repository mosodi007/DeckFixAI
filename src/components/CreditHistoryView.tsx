import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ShoppingBag, Zap, Calendar } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-slate-600">Loading credit history...</div>
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
          <h1 className="text-5xl font-semibold text-slate-900 mb-2 tracking-tighter">Credit History</h1>
          <p className="text-slate-600 text-lg">Track your credit usage and transactions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Current Balance</div>
            <div className="text-4xl font-bold text-slate-900">{credits?.creditsBalance || 0}</div>
            <div className="text-slate-500 text-xs mt-1">credits available</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Total Used</div>
            <div className="text-4xl font-bold text-red-600">{totalDeducted}</div>
            <div className="text-slate-500 text-xs mt-1">credits spent</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Avg. Complexity</div>
            <div className="text-4xl font-bold text-yellow-600">{avgComplexity.toFixed(0)}</div>
            <div className="text-slate-500 text-xs mt-1">out of 100</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-slate-600 text-sm mb-2 font-medium">Avg. Cost/Fix</div>
            <div className="text-4xl font-bold text-slate-900">{avgCost.toFixed(1)}</div>
            <div className="text-slate-500 text-xs mt-1">credits per fix</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
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
      </div>
    </div>
  );
}
