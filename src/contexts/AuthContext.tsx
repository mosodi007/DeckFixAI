import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange, getUserProfile } from '../services/authService';
import { migrateSessionAnalyses } from '../services/analysisService';
import { getSessionId, clearSessionId } from '../services/sessionService';
import { supabase } from '../services/analysisService';

interface UserProfile {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
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

  async function loadUserProfile(userId: string, currentUser?: User | null) {
    const profile = await getUserProfile(userId);
    const userToUse = currentUser || user;
    
    // Get avatar from user metadata (for Google OAuth users)
    let avatarUrl: string | null = null;
    if (userToUse) {
      const metadata = userToUse.user_metadata || userToUse.raw_user_meta_data;
      avatarUrl = metadata?.avatar_url || metadata?.picture || null;
    }
    
    if (profile) {
      setUserProfile({
        fullName: profile.full_name,
        email: profile.email,
        avatarUrl,
      });
    } else if (userToUse) {
      // If no profile but we have user, try to get avatar from user metadata
      setUserProfile({
        fullName: userToUse.user_metadata?.full_name || userToUse.raw_user_meta_data?.full_name || null,
        email: userToUse.email || '',
        avatarUrl,
      });
    }
  }

  useEffect(() => {
    getCurrentUser().then(async (currentUser) => {
      if (currentUser) {
        console.log('User already signed in:', currentUser.id, 'Is anonymous:', currentUser.is_anonymous);
        setUser(currentUser);
        if (currentUser.email) {
          await loadUserProfile(currentUser.id, currentUser);
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error during authentication initialization:', error);
      setLoading(false);
    });

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
      
      // Check if this is a new Google OAuth signup and send welcome email
      // Google OAuth users are automatically verified, so send welcome email immediately
      if (updatedUser && updatedUser.email && !previousUser) {
        // Check if this is a Google OAuth signup
        const userMetadata = (updatedUser as any).app_metadata || (updatedUser as any).raw_app_meta_data || {};
        const isGoogleOAuth = userMetadata?.provider === 'google';
        
        if (isGoogleOAuth) {
          // This is a new Google OAuth signup - check if profile was just created
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('created_at, full_name')
            .eq('id', updatedUser.id)
            .maybeSingle();
          
          if (profile && updatedUser.created_at) {
            const profileAge = new Date().getTime() - new Date(profile.created_at).getTime();
            // If profile was created within last 30 seconds, it's a new signup
            if (profileAge < 30000) {
              // Send welcome email for Google OAuth users (they're automatically verified)
              supabase.functions.invoke('send-welcome-email', {
                body: {
                  email: updatedUser.email,
                  fullName: profile.full_name || updatedUser.user_metadata?.full_name || updatedUser.user_metadata?.name || undefined,
                },
              }).catch((err) => {
                console.error('Failed to send welcome email:', err);
              });
              
              // Set flag to show welcome modal for new OAuth signups
              sessionStorage.setItem('showWelcomeModal', 'true');
            }
          }
        }
        // Note: Email/password signups will get welcome email when they verify their email (handled in App.tsx)
      }
      
      if (updatedUser && updatedUser.email) {
        await loadUserProfile(updatedUser.id, updatedUser);
      } else if (updatedUser) {
        // Even without email, try to get avatar from metadata
        const metadata = updatedUser.user_metadata || updatedUser.raw_user_meta_data;
        const avatarUrl = metadata?.avatar_url || metadata?.picture || null;
        setUserProfile({
          fullName: metadata?.full_name || metadata?.name || null,
          email: updatedUser.email || '',
          avatarUrl,
        });
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
