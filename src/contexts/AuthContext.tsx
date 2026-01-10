import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange, getUserProfile } from '../services/authService';
import { migrateSessionAnalyses } from '../services/analysisService';
import { getSessionId, clearSessionId } from '../services/sessionService';

interface UserProfile {
  fullName: string | null;
  email: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUserProfile(userId: string) {
    const profile = await getUserProfile(userId);
    if (profile) {
      setUserProfile({
        fullName: profile.full_name,
        email: profile.email,
      });
    }
  }

  useEffect(() => {
    getCurrentUser().then(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser.id);
      }
      setLoading(false);
    });

    const subscription = onAuthStateChange(async (updatedUser) => {
      if (updatedUser && !user) {
        const sessionId = getSessionId();
        if (sessionId) {
          try {
            await migrateSessionAnalyses(sessionId, updatedUser.id);
            clearSessionId();
            console.log('Migrated session analyses to user account');
          } catch (error) {
            console.error('Failed to migrate session analyses:', error);
          }
        }
      }

      setUser(updatedUser);
      if (updatedUser) {
        await loadUserProfile(updatedUser.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
