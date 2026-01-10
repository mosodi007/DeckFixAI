import { useState, useEffect } from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import { getUserCreditBalance, type UserCredits } from '../services/creditService';
import { useAuth } from '../contexts/AuthContext';

export function CreditBalanceIndicator() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCredits();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadCredits() {
    const data = await getUserCreditBalance();
    setCredits(data);
    setLoading(false);
  }

  if (!user || loading) {
    return null;
  }

  if (!credits) {
    return null;
  }

  const balance = credits.creditsBalance;
  const getColorClass = () => {
    if (balance >= 50) return 'bg-green-50 text-green-700 border-green-200';
    if (balance >= 20) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getColorClass()}`}>
      <Coins className="w-4 h-4" />
      <span className="font-bold text-lg">{balance}</span>
      <span className="text-xs font-medium opacity-80">credits</span>
      {balance < 20 && (
        <button
          className="ml-2 flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-all shadow-sm"
          onClick={() => window.location.href = '/pricing'}
        >
          <TrendingUp className="w-3 h-3" />
          Add More
        </button>
      )}
    </div>
  );
}
