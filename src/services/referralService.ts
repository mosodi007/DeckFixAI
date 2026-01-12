import { supabase } from './authService';

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected' | 'pending_review';
  creditsAwardedReferrer: number;
  creditsAwardedReferred: number;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  userAgent: string | null;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  referredUserEmail?: string; // For display purposes
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  lifetimeLimit: number;
  remainingReferrals: number;
}

/**
 * Generate or retrieve referral code for the current user
 */
export async function generateReferralCode(userId?: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    console.error('No user ID provided for referral code generation');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('generate_referral_code', {
      p_user_id: targetUserId
    });

    if (error) {
      console.error('Error generating referral code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception generating referral code:', error);
    return null;
  }
}

/**
 * Get user's referral code
 */
export async function getReferralCode(userId?: string): Promise<ReferralCode | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching referral code:', error);
    return null;
  }

  if (!data) {
    // Try to generate one if it doesn't exist
    const code = await generateReferralCode(targetUserId);
    if (code) {
      // Fetch again after generation
      return getReferralCode(targetUserId);
    }
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    code: data.code,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isActive: data.is_active,
  };
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(code: string): Promise<{
  isValid: boolean;
  referrerId: string | null;
}> {
  if (!code || code.trim() === '') {
    return { isValid: false, referrerId: null };
  }

  try {
    const { data, error } = await supabase.rpc('validate_referral_code', {
      p_code: code.trim().toUpperCase()
    });

    if (error) {
      console.error('Error validating referral code:', error);
      return { isValid: false, referrerId: null };
    }

    if (!data || data.length === 0) {
      return { isValid: false, referrerId: null };
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      referrerId: result.referrer_id,
    };
  } catch (error) {
    console.error('Exception validating referral code:', error);
    return { isValid: false, referrerId: null };
  }
}

/**
 * Apply referral code during signup
 * This should be called before or during user creation
 */
export async function applyReferralCode(
  code: string,
  userId: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const validation = await validateReferralCode(code);

  if (!validation.isValid || !validation.referrerId) {
    return { success: false, error: 'Invalid referral code' };
  }

  if (validation.referrerId === userId) {
    return { success: false, error: 'Cannot refer yourself' };
  }

  // Check if user already has a referral
  const { data: existingReferral } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', userId)
    .maybeSingle();

  if (existingReferral) {
    return { success: false, error: 'Referral code already applied' };
  }

  // Generate device fingerprint if not provided
  const deviceFingerprint = metadata?.deviceFingerprint || 
    (typeof window !== 'undefined' ? 
      btoa(`${navigator.userAgent}${screen.width}x${screen.height}${Intl.DateTimeFormat().resolvedOptions().timeZone}`) : 
      null);

  // Create referral record
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: validation.referrerId,
      referred_id: userId,
      referral_code: code.trim().toUpperCase(),
      status: 'pending',
      ip_address: metadata?.ipAddress || null,
      device_fingerprint: deviceFingerprint,
      user_agent: metadata?.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : null),
      metadata: {
        applied_at: new Date().toISOString(),
        ...metadata,
      },
    });

  if (error) {
    console.error('Error applying referral code:', error);
    return { success: false, error: 'Failed to apply referral code' };
  }

  // Update user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      referral_code_used: code.trim().toUpperCase(),
      referred_by: validation.referrerId,
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating user profile with referral:', profileError);
    // Don't fail the whole operation if profile update fails
  }

  return { success: true };
}

/**
 * Get referral statistics for the current user
 */
export async function getReferralStats(userId?: string): Promise<ReferralStats | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('referrals')
    .select('status, credits_awarded_referrer')
    .eq('referrer_id', targetUserId);

  if (error) {
    console.error('Error fetching referral stats:', error);
    return null;
  }

  const totalReferrals = data?.length || 0;
  const completedReferrals = data?.filter(r => r.status === 'completed').length || 0;
  const pendingReferrals = data?.filter(r => r.status === 'pending' || r.status === 'pending_review').length || 0;
  const totalCreditsEarned = data?.reduce((sum, r) => sum + (r.credits_awarded_referrer || 0), 0) || 0;
  const lifetimeLimit = 50; // Should match database function
  const remainingReferrals = Math.max(0, lifetimeLimit - completedReferrals);

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalCreditsEarned,
    lifetimeLimit,
    remainingReferrals,
  };
}

/**
 * Get referral history for the current user
 */
export async function getReferralHistory(userId?: string, limit: number = 50): Promise<Referral[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referred_user:user_profiles!referrals_referred_id_fkey(email)
    `)
    .eq('referrer_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching referral history:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    referrerId: r.referrer_id,
    referredId: r.referred_id,
    referralCode: r.referral_code,
    status: r.status,
    creditsAwardedReferrer: r.credits_awarded_referrer || 0,
    creditsAwardedReferred: r.credits_awarded_referred || 0,
    ipAddress: r.ip_address,
    deviceFingerprint: r.device_fingerprint,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    metadata: r.metadata || {},
    referredUserEmail: r.referred_user?.email || undefined,
  }));
}

/**
 * Process referral credits after referred user completes first action
 * This is typically called from the backend/Edge Function, but can be called from frontend if needed
 */
export async function processReferralCredits(
  referredUserId: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  referrerCreditsAwarded: number;
  referredCreditsAwarded: number;
}> {
  try {
    const { data, error } = await supabase.rpc('process_referral_credits', {
      p_referred_user_id: referredUserId,
      p_ip_address: metadata?.ipAddress || null,
      p_device_fingerprint: metadata?.deviceFingerprint || null,
      p_user_agent: metadata?.userAgent || null,
    });

    if (error) {
      console.error('Error processing referral credits:', error);
      return {
        success: false,
        message: error.message || 'Failed to process referral credits',
        referrerCreditsAwarded: 0,
        referredCreditsAwarded: 0,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        message: 'No referral data returned',
        referrerCreditsAwarded: 0,
        referredCreditsAwarded: 0,
      };
    }

    const result = data[0];
    return {
      success: result.success,
      message: result.message,
      referrerCreditsAwarded: result.referrer_credits_awarded || 0,
      referredCreditsAwarded: result.referred_credits_awarded || 0,
    };
  } catch (error) {
    console.error('Exception processing referral credits:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process referral credits',
      referrerCreditsAwarded: 0,
      referredCreditsAwarded: 0,
    };
  }
}

/**
 * Get referral link for the current user
 */
export async function getReferralLink(userId?: string): Promise<string | null> {
  const code = await getReferralCode(userId);
  if (!code) {
    return null;
  }

  // Get the base URL from environment or use current origin
  const baseUrl = import.meta.env.VITE_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://deckfix.ai');
  
  return `${baseUrl}/signup?ref=${code.code}`;
}

