import { supabase } from './analysisService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Send a verification email to the user
 */
export async function sendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user is Google OAuth (always verified)
    const userMetadata = (user as any).app_metadata || (user as any).raw_app_meta_data || {};
    const isGoogleOAuth = userMetadata?.provider === 'google';
    
    if (isGoogleOAuth) {
      return { success: false, error: 'Email is already verified' };
    }

    // For email/password users, check is_verified from user_profiles (source of truth)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Fallback to email_confirmed_at if profile check fails
      if (user.email_confirmed_at) {
        return { success: false, error: 'Email is already verified' };
      }
    } else if (profile?.is_verified === true) {
      return { success: false, error: 'Email is already verified' };
    }

    // First, try to use Supabase's resend to generate a token
    // Then send via Resend for better deliverability
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
    });

    // Call our Edge Function to send the email via Resend
    // We'll generate a verification link that Supabase can verify
    const { data: functionData, error: functionError } = await supabase.functions.invoke('send-verification-email', {
      body: {
        email: user.email,
        userId: user.id,
        token: 'resend', // Signal to use Supabase's verification flow
      },
    });

    if (functionError) {
      console.error('Error calling send-verification-email function:', functionError);
      // Fallback to Supabase's default email sending
      if (resendError) {
        return { success: false, error: resendError.message };
      }
      return { success: true };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in sendVerificationEmail:', error);
    return { success: false, error: error.message || 'Failed to send verification email' };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Supabase handles email verification through the auth API
    // The token is typically handled via URL hash or query params
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return { success: false, error: error.message || 'Failed to verify email' };
  }
}

/**
 * Check if user's email is verified
 * For Google OAuth users, they are always verified
 * For email/password users, check the is_verified column in user_profiles
 */
export async function isEmailVerified(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Check if user signed up via Google OAuth (Google emails are pre-verified)
    const userMetadata = (user as any).app_metadata || (user as any).raw_app_meta_data || {};
    const isGoogleOAuth = userMetadata?.provider === 'google';
    
    if (isGoogleOAuth) {
      return true; // Google OAuth users are always verified
    }

    // For email/password users, check the is_verified column in user_profiles
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to checking email_confirmed_at
      return user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;
    }

    return profile?.is_verified === true;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
}

