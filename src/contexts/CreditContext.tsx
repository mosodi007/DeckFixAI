import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const refreshCredits = useCallback(async (silent = false) => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await getUserCreditBalance();
      if (data) {
        // Only update if the value actually changed to prevent unnecessary re-renders
        setCredits(prevCredits => {
          if (prevCredits?.creditsBalance === data.creditsBalance) {
            return prevCredits; // Return previous object if balance hasn't changed
          }
          return data;
        });
      } else {
        // If no credits found, wait a bit and retry (might be a timing issue with trigger)
        console.warn('No credits found for user, retrying in 1 second...');
        setTimeout(async () => {
          const retryData = await getUserCreditBalance();
          if (retryData) {
            setCredits(retryData);
          } else {
            console.error('Credits still not found after retry for user:', user.id);
          }
          if (!silent) {
            setLoading(false);
          }
        }, 1000);
        return; // Don't set loading to false yet, wait for retry
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // Poll for credit updates periodically when user is logged in
  // Use a longer interval (30 seconds) to reduce unnecessary refreshes
  // Credits will still update immediately after actions (upload, fix generation, etc.)
  useEffect(() => {
    if (!user) return;

    // Poll every 30 seconds to keep credits updated, but silently (no loading state)
    const pollInterval = setInterval(() => {
      refreshCredits(true); // Silent refresh - no loading state change
    }, 30000); // Poll every 30 seconds instead of 3

    return () => {
      clearInterval(pollInterval);
    };
  }, [user, refreshCredits]);

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
