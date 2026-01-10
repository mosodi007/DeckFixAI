import { supabase } from './authService';

export interface UserCredits {
  userId: string;
  creditsBalance: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  monthlyCreditsAllocated: number;
  creditsResetDate: string | null;
  subscriptionTier: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: string;
  description: string;
  complexityScore: number | null;
  creditsCost: number | null;
  balanceAfter: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  priceMonthly: number;
  priceAnnual: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  features: string[];
  isActive: boolean;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string | null;
  isActive: boolean;
}

export async function getUserCreditBalance(): Promise<UserCredits | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    creditsBalance: data.credits_balance,
    subscriptionCredits: data.subscription_credits,
    purchasedCredits: data.purchased_credits,
    monthlyCreditsAllocated: data.monthly_credits_allocated,
    creditsResetDate: data.credits_reset_date,
    subscriptionTier: data.subscription_tier,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deductCredits(
  creditCost: number,
  description: string,
  complexityScore: number,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const currentCredits = await getUserCreditBalance();

  if (!currentCredits) {
    return { success: false, error: 'Unable to fetch credit balance' };
  }

  if (currentCredits.creditsBalance < creditCost) {
    return { success: false, error: 'Insufficient credits' };
  }

  const newBalance = currentCredits.creditsBalance - creditCost;
  let newSubscriptionCredits = currentCredits.subscriptionCredits;
  let newPurchasedCredits = currentCredits.purchasedCredits;

  if (currentCredits.subscriptionCredits >= creditCost) {
    newSubscriptionCredits -= creditCost;
  } else {
    const remainingToDeduct = creditCost - currentCredits.subscriptionCredits;
    newSubscriptionCredits = 0;
    newPurchasedCredits -= remainingToDeduct;
  }

  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_balance: newBalance,
      subscription_credits: newSubscriptionCredits,
      purchased_credits: newPurchasedCredits,
    })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    return { success: false, error: 'Failed to update credits' };
  }

  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: user.id,
      amount: -creditCost,
      transaction_type: 'deduction',
      description,
      complexity_score: complexityScore,
      credits_cost: creditCost,
      balance_after: newBalance,
      metadata,
    });

  if (transactionError) {
    console.error('Error logging transaction:', transactionError);
  }

  return { success: true, newBalance };
}

export async function addCredits(
  amount: number,
  transactionType: 'purchase' | 'subscription_renewal' | 'refund',
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const currentCredits = await getUserCreditBalance();

  if (!currentCredits) {
    return { success: false, error: 'Unable to fetch credit balance' };
  }

  const newBalance = currentCredits.creditsBalance + amount;
  let newSubscriptionCredits = currentCredits.subscriptionCredits;
  let newPurchasedCredits = currentCredits.purchasedCredits;

  if (transactionType === 'purchase') {
    newPurchasedCredits += amount;
  } else if (transactionType === 'subscription_renewal') {
    newSubscriptionCredits += amount;
  } else if (transactionType === 'refund') {
    newPurchasedCredits += amount;
  }

  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_balance: newBalance,
      subscription_credits: newSubscriptionCredits,
      purchased_credits: newPurchasedCredits,
    })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating credits:', updateError);
    return { success: false, error: 'Failed to update credits' };
  }

  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: user.id,
      amount,
      transaction_type: transactionType,
      description,
      balance_after: newBalance,
      metadata,
    });

  if (transactionError) {
    console.error('Error logging transaction:', transactionError);
  }

  return { success: true, newBalance };
}

export async function getCreditHistory(
  limit: number = 50,
  offset: number = 0
): Promise<CreditTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching credit history:', error);
    return [];
  }

  return data.map(transaction => ({
    id: transaction.id,
    userId: transaction.user_id,
    amount: transaction.amount,
    transactionType: transaction.transaction_type,
    description: transaction.description,
    complexityScore: transaction.complexity_score,
    creditsCost: transaction.credits_cost,
    balanceAfter: transaction.balance_after,
    metadata: transaction.metadata || {},
    createdAt: transaction.created_at,
  }));
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  if (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }

  return data.map(plan => ({
    id: plan.id,
    name: plan.name,
    monthlyCredits: plan.monthly_credits,
    priceMonthly: plan.price_monthly,
    priceAnnual: plan.price_annual,
    stripePriceIdMonthly: plan.stripe_price_id_monthly,
    stripePriceIdAnnual: plan.stripe_price_id_annual,
    features: plan.features || [],
    isActive: plan.is_active,
  }));
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('credits', { ascending: true });

  if (error) {
    console.error('Error fetching credit packages:', error);
    return [];
  }

  return data.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price: pkg.price,
    stripePriceId: pkg.stripe_price_id,
    isActive: pkg.is_active,
  }));
}

export async function checkSufficientCredits(requiredCredits: number): Promise<boolean> {
  const credits = await getUserCreditBalance();
  return credits ? credits.creditsBalance >= requiredCredits : false;
}
