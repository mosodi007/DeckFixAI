import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserCreditBalance, type UserCredits } from '../services/creditService';
import { useAuth } from './AuthContext';

interface CreditContextType {
  credits: UserCredits | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export function CreditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getUserCreditBalance();
      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCredits();
  }, [user]);

  return (
    <CreditContext.Provider value={{ credits, loading, refreshCredits }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}
