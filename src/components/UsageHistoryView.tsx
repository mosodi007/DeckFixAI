import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingDown,
  ShoppingBag,
  RefreshCw,
  TrendingUp,
  Zap,
  Calendar,
  FileText,
  Filter,
  Download,
  Search,
} from 'lucide-react';
import {
  getCreditHistory,
  getUserCreditBalance,
  type CreditTransaction,
  type UserCredits,
} from '../services/creditService';
import { AnimatedCounter } from './AnimatedCounter';

interface UsageHistoryViewProps {
  onBack: () => void;
}

export function UsageHistoryView({ onBack }: UsageHistoryViewProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CreditTransaction[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, searchQuery, dateRange]);

  async function loadData() {
    setLoading(true);
    const [history, balance] = await Promise.all([
      getCreditHistory(500, 0),
      getUserCreditBalance(),
    ]);

    setTransactions(history);
    setCredits(balance);
    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...transactions];

    // Filter by transaction type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transactionType === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(t => new Date(t.createdAt) >= cutoffDate);
    }

    setFilteredTransactions(filtered);
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

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deduction':
        return 'bg-red-50 border-red-200';
      case 'purchase':
        return 'bg-green-50 border-green-200';
      case 'subscription_renewal':
        return 'bg-blue-50 border-blue-200';
      case 'refund':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-slate-50 border-slate-200';
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
        {label} Complexity
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalAdded = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const uniqueTypes = Array.from(new Set(transactions.map(t => t.transactionType)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading usage history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Subscription & Credits
        </button>

        <div className="mb-10">
          <h1 className="text-5xl font-semibold text-slate-900 mb-3 tracking-tighter">
            Credit Usage History
          </h1>
          <p className="text-slate-600 text-lg">
            Detailed overview of all your credit transactions and activity
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-slate-900 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Current Balance</div>
            </div>
            <div className="text-4xl font-bold text-slate-900 mb-1">
              <AnimatedCounter value={credits?.creditsBalance || 0} />
            </div>
            <div className="text-sm text-slate-500">credits available</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Total Spent</div>
            </div>
            <div className="text-4xl font-bold text-red-600 mb-1">{totalSpent}</div>
            <div className="text-sm text-slate-500">credits used</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Total Added</div>
            </div>
            <div className="text-4xl font-bold text-green-600 mb-1">{totalAdded}</div>
            <div className="text-sm text-slate-500">credits received</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-slate-600 font-medium">Total Transactions</div>
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-1">{transactions.length}</div>
            <div className="text-sm text-slate-500">all-time</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transaction Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
              >
                <option value="all">All Time</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          {(filterType !== 'all' || searchQuery || dateRange !== 'all') && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </p>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setSearchQuery('');
                    setDateRange('all');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">Transactions</h2>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-1">No transactions found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery || filterType !== 'all' || dateRange !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your transaction history will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`p-6 hover:bg-slate-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getTransactionColor(transaction.transactionType)}`}>
                        {getTransactionIcon(transaction.transactionType)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h3 className="font-semibold text-slate-900 text-base">
                            {transaction.description}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(transaction.createdAt)}
                          </span>
                          {transaction.complexityScore !== null && (
                            <span className="flex items-center gap-2">
                              {getComplexityBadge(transaction.complexityScore)}
                            </span>
                          )}
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                            {transaction.transactionType.split('_').map(word =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="flex items-center gap-8 ml-4">
                      {transaction.creditsCost && (
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1 font-medium">Cost</div>
                          <div className="text-lg font-bold text-red-600">
                            {transaction.creditsCost}
                          </div>
                        </div>
                      )}
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs text-slate-500 mb-1 font-medium">Change</div>
                        <div
                          className={`text-xl font-bold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs text-slate-500 mb-1 font-medium">Balance</div>
                        <div className="text-xl font-bold text-slate-900">
                          {transaction.balanceAfter}
                        </div>
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
