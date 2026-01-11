import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange, getUserProfile, supabase } from '../services/authService';
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
    async function initAuth() {
      try {
        const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !sessionData?.session) {
          console.log('No valid session found or session expired');

          await supabase.auth.signOut();

          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const currentUser = sessionData.session.user;
        if (currentUser) {
          console.log('User already signed in:', currentUser.id, 'Is anonymous:', currentUser.is_anonymous);
          setUser(currentUser);
          if (currentUser.email) {
            await loadUserProfile(currentUser.id);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error during authentication initialization:', error);

        await supabase.auth.signOut().catch(() => {});

        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    }

    initAuth();

    const subscription = onAuthStateChange(async (updatedUser) => {
      const previousUser = user;
      const previousWasAnonymous = previousUser && previousUser.is_anonymous;
      const newUserIsAuthenticated = updatedUser && !updatedUser.is_anonymous;

      if (previousWasAnonymous && newUserIsAuthenticated && previousUser) {
        try {
          await migrateSessionAnalyses(previousUser.id, updatedUser.id);
          console.log('Migrated anonymous analyses to authenticated user account');
        } catch (error) {
          console.error('Failed to migrate analyses:', error);
        }
      }

      const sessionId = getSessionId();
      if (sessionId && newUserIsAuthenticated) {
        try {
          await migrateSessionAnalyses(sessionId, updatedUser.id);
          clearSessionId();
          console.log('Migrated session analyses to user account');
        } catch (error) {
          console.error('Failed to migrate session analyses:', error);
        }
      }

      setUser(updatedUser);
      if (updatedUser && updatedUser.email) {
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
