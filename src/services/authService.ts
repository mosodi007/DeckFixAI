import { supabase } from './analysisService';
import type { User, Session } from '@supabase/supabase-js';

export { supabase };

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  referralCode?: string;
  metadata?: Record<string, unknown>;
}

export interface LoginData {
  email: string;
  password: string;
}

export async function signUp(data: SignUpData): Promise<{ user: User | null; error: Error | null }> {
  const userMetadata: Record<string, unknown> = {
    full_name: data.fullName || '',
    ...data.metadata,
  };

  // Add referral code to metadata if provided
  if (data.referralCode) {
    userMetadata.referral_code = data.referralCode.trim().toUpperCase();
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: userMetadata,
    },
  });

  if (error) {
    return { user: null, error: new Error(error.message) };
  }

  // Send welcome email (fire and forget - don't block signup if it fails)
  if (authData.user) {
    supabase.functions.invoke('send-welcome-email', {
      body: {
        email: data.email,
        fullName: data.fullName || undefined,
      },
    }).catch((err) => {
      console.error('Failed to send welcome email:', err);
      // Don't throw - welcome email failure shouldn't block signup
    });
  }

  return { user: authData.user, error: null };
}

export async function login(data: LoginData): Promise<{ user: User | null; error: Error | null }> {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { user: null, error: new Error(error.message) };
  }

  return { user: authData.user, error: null };
}

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function signInWithGoogleOneTap(credential: string): Promise<{ user: User | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
  });

  if (error) {
    return { user: null, error: new Error(error.message) };
  }

  // Check if this is a new user (just signed up) by checking if they have a profile
  // If it's a new signup, send welcome email
  if (data.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('created_at')
      .eq('id', data.user.id)
      .maybeSingle();
    
    // If profile was just created (within last 5 seconds), send welcome email
    if (profile && data.user.created_at) {
      const profileAge = new Date().getTime() - new Date(profile.created_at).getTime();
      if (profileAge < 5000) { // Profile created within last 5 seconds
        supabase.functions.invoke('send-welcome-email', {
          body: {
            email: data.user.email || '',
            fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || undefined,
          },
        }).catch((err) => {
          console.error('Failed to send welcome email:', err);
        });
      }
    }
  }

  return { user: data.user, error: null };
}

export async function logout(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function signInAnonymously(): Promise<{ user: User | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    return { user: null, error: new Error(error.message) };
  }

  return { user: data.user, error: null };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string): Promise<{ full_name: string | null; email: string; is_verified?: boolean } | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('full_name, email, is_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return subscription;
}
