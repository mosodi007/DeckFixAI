import { supabase } from './authService';

export interface CreateCheckoutSessionParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string | null;
  url: string;
  updated?: boolean;
  isDowngrade?: boolean;
}

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ success: boolean; url?: string; error?: string; updated?: boolean; isDowngrade?: boolean }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: params.priceId,
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Stripe checkout error:', error);
      return { success: false, error: error.error || 'Failed to create checkout session' };
    }

    const data: CheckoutSessionResponse = await response.json();

    if (data.url) {
      return { success: true, url: data.url, updated: data.updated, isDowngrade: data.isDowngrade };
    }

    return { success: false, error: 'No checkout URL returned' };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { success: false, error: 'Failed to create checkout session' };
  }
}

export async function redirectToCheckout(params: CreateCheckoutSessionParams): Promise<void> {
  const result = await createCheckoutSession(params);

  if (result.success && result.url) {
    window.location.href = result.url;
  } else {
    throw new Error(result.error || 'Failed to redirect to checkout');
  }
}

export function getSuccessUrl(basePath: string = '/dashboard'): string {
  return `${window.location.origin}${basePath}?checkout=success`;
}

export function getCancelUrl(basePath: string = '/pricing'): string {
  return `${window.location.origin}${basePath}?checkout=cancelled`;
}
