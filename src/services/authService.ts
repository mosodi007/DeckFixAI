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
      emailRedirectTo: `${window.location.origin}/auth/verify-email?verified=true`,
    },
  });

  if (error) {
    return { user: null, error: new Error(error.message) };
  }

  // Automatically send verification email via our custom Resend template (only for email/password signups)
  // Google OAuth users don't need verification emails
  if (authData.user && !authData.user.email_confirmed_at) {
    // Check if this is a Google OAuth signup
    const userMetadata = (authData.user as any).app_metadata || (authData.user as any).raw_app_meta_data || {};
    const isGoogleOAuth = userMetadata?.provider === 'google';
    
    // Only send verification email for email/password signups
    if (!isGoogleOAuth) {
      // Send our custom verification email via Edge Function
      // The Edge Function will use Supabase's admin API to generate a proper verification link
      supabase.functions.invoke('send-verification-email', {
        body: {
          email: data.email,
          userId: authData.user.id,
          token: 'auto-send', // Signal that this is automatic on signup
        },
      }).catch((err) => {
        console.error('Failed to send verification email:', err);
        // Don't throw - email failure shouldn't block signup
        // Supabase's default email will still be sent
      });
    }
  }

  // Note: Welcome email is now sent when email is verified (not on signup)
  // This is handled in App.tsx when verification is detected

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

  // Note: Welcome email is now sent when email is verified (not on signup)
  // Google OAuth users are automatically verified, so welcome email will be sent via App.tsx

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
