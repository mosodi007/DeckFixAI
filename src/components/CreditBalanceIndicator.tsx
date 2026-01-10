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
    if (balance >= 50) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (balance >= 20) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getColorClass()}`}>
      <Coins className="w-4 h-4" />
      <span className="font-semibold">{balance}</span>
      <span className="text-xs opacity-80">credits</span>
      {balance < 20 && (
        <button
          className="ml-2 flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-medium transition-all"
          onClick={() => window.location.href = '/pricing'}
        >
          <TrendingUp className="w-3 h-3" />
          Add More
        </button>
      )}
    </div>
  );
}
