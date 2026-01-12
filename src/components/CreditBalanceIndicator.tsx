import { Coins, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { AnimatedCounter } from './AnimatedCounter';

interface CreditBalanceIndicatorProps {
  onViewHistory?: () => void;
}

export function CreditBalanceIndicator({ onViewHistory }: CreditBalanceIndicatorProps) {
  const { user } = useAuth();
  const { credits, loading } = useCredits();

  if (!user || loading) {
    return null;
  }

  if (!credits) {
    return null;
  }

  const balance = credits.creditsBalance;
  const getColorClass = () => {
    if (balance >= 50) return 'bg-green-50 border-green-200 hover:bg-green-100';
    if (balance >= 20) return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    return 'bg-red-50 border-red-200 hover:bg-red-100';
  };

  const getTextColorClass = () => {
    if (balance >= 50) return 'text-green-700';
    if (balance >= 20) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <button
      onClick={onViewHistory}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 cursor-pointer ${getColorClass()}`}
      title="View credit history"
    >
      <Coins className={`w-4 h-4 transition-colors duration-300 ${getTextColorClass()}`} />
      <AnimatedCounter 
        value={balance} 
        className={`font-bold text-lg ${getTextColorClass()}`}
      />
      <span className={`text-xs font-medium opacity-80 transition-colors duration-300 ${getTextColorClass()}`}>credits</span>
      {balance < 20 && (
        <span
          className="ml-2 flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-all shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = '/pricing';
          }}
        >
          <TrendingUp className="w-3 h-3" />
          Add More
        </span>
      )}
    </button>
  );
}
