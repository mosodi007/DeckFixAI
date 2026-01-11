import { supabase } from './authService';

export interface UpgradePreview {
  isUpgrade: boolean;
  isDowngrade?: boolean;
  currentTier: {
    credits: number;
    price_monthly: number;
    price_annual: number;
  };
  targetTier: {
    credits: number;
    price_monthly: number;
    price_annual: number;
  };
  billingPeriod?: 'monthly' | 'annual';
  baseUpgradeCost?: number;
  proratedUpgradeCost?: number;
  stripePriceId?: string;
  daysRemaining?: number;
  totalDays?: number;
  nextBillingDate?: string;
  proratedPercentage?: number;
  message?: string;
}

export async function getUpgradePreview(targetPriceId: string): Promise<UpgradePreview> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-upgrade-preview`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_price_id: targetPriceId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get upgrade preview');
  }

  return await response.json();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function calculateSavings(
  currentTierPrice: number,
  targetTierPrice: number,
  proratedCost: number
): number {
  const fullUpgradeCost = targetTierPrice - currentTierPrice;
  const savings = fullUpgradeCost - proratedCost;
  return Math.max(0, savings);
}
