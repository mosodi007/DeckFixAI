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

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  billingPeriod: 'monthly' | 'annual';
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  cancelAtPeriodEnd: boolean;
  selectedCreditTier: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProCreditTier {
  id: string;
  credits: number;
  priceMonthly: number;
  priceAnnual: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ContactRequest {
  name: string;
  email: string;
  company?: string;
  estimatedUsage?: string;
  message?: string;
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

  if (!data || data.length === 0) {
    console.warn('No subscription plans found');
    return [];
  }

  return data.map(plan => ({
    id: plan.id,
    name: plan.name,
    monthlyCredits: plan.monthly_credits,
    priceMonthly: parseFloat(plan.price_monthly),
    priceAnnual: parseFloat(plan.price_annual),
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

  if (!data || data.length === 0) {
    console.warn('No credit packages found');
    return [];
  }

  return data.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price: parseFloat(pkg.price),
    stripePriceId: pkg.stripe_price_id,
    isActive: pkg.is_active,
  }));
}

export async function checkSufficientCredits(requiredCredits: number): Promise<boolean> {
  const credits = await getUserCreditBalance();
  return credits ? credits.creditsBalance >= requiredCredits : false;
}

export async function getUserSubscription(): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id,
    billingPeriod: data.billing_period,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    stripeSubscriptionId: data.stripe_subscription_id,
    stripeCustomerId: data.stripe_customer_id,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    selectedCreditTier: data.selected_credit_tier,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getSubscriptionPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription plan:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    monthlyCredits: data.monthly_credits,
    priceMonthly: parseFloat(data.price_monthly),
    priceAnnual: parseFloat(data.price_annual),
    stripePriceIdMonthly: data.stripe_price_id_monthly,
    stripePriceIdAnnual: data.stripe_price_id_annual,
    features: data.features || [],
    isActive: data.is_active,
  };
}

export async function getProCreditTiers(): Promise<ProCreditTier[]> {
  const { data, error } = await supabase
    .from('pro_credit_tiers')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching pro credit tiers:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('No pro credit tiers found');
    return [];
  }

  return data.map(tier => ({
    id: tier.id,
    credits: tier.credits,
    priceMonthly: parseFloat(tier.price_monthly),
    priceAnnual: parseFloat(tier.price_annual),
    stripePriceIdMonthly: tier.stripe_price_id_monthly,
    stripePriceIdAnnual: tier.stripe_price_id_annual,
    displayOrder: tier.display_order,
    isActive: tier.is_active,
  }));
}

export async function submitContactRequest(request: ContactRequest): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('contact_requests')
    .insert({
      name: request.name,
      email: request.email,
      company: request.company,
      estimated_usage: request.estimatedUsage,
      message: request.message,
    });

  if (error) {
    console.error('Error submitting contact request:', error);
    return { success: false, error: 'Failed to submit contact request' };
  }

  return { success: true };
}

export async function getUserProCreditTier(): Promise<ProCreditTier | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: stripeData, error: stripeError } = await supabase
    .from('stripe_subscriptions')
    .select('price_id, customer_id')
    .eq('customer_id', (await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle())?.data?.customer_id || '')
    .eq('status', 'active')
    .maybeSingle();

  if (stripeError || !stripeData?.price_id) {
    return null;
  }

  const { data: tiers, error: tiersError } = await supabase
    .from('pro_credit_tiers')
    .select('*')
    .or(`stripe_price_id_monthly.eq.${stripeData.price_id},stripe_price_id_annual.eq.${stripeData.price_id}`)
    .maybeSingle();

  if (tiersError || !tiers) {
    return null;
  }

  return {
    id: tiers.id,
    credits: tiers.credits,
    priceMonthly: parseFloat(tiers.price_monthly),
    priceAnnual: parseFloat(tiers.price_annual),
    stripePriceIdMonthly: tiers.stripe_price_id_monthly,
    stripePriceIdAnnual: tiers.stripe_price_id_annual,
    displayOrder: tiers.display_order,
    isActive: tiers.is_active,
  };
}

export async function getUserCurrentBillingPeriod(): Promise<'monthly' | 'annual' | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!customerData) {
    return null;
  }

  const { data: stripeData } = await supabase
    .from('stripe_subscriptions')
    .select('price_id')
    .eq('customer_id', customerData.customer_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!stripeData?.price_id) {
    return null;
  }

  const { data: tierData } = await supabase
    .from('pro_credit_tiers')
    .select('stripe_price_id_monthly, stripe_price_id_annual')
    .or(`stripe_price_id_monthly.eq.${stripeData.price_id},stripe_price_id_annual.eq.${stripeData.price_id}`)
    .maybeSingle();

  if (!tierData) {
    return null;
  }

  if (tierData.stripe_price_id_monthly === stripeData.price_id) {
    return 'monthly';
  } else if (tierData.stripe_price_id_annual === stripeData.price_id) {
    return 'annual';
  }

  return null;
}

export async function getScheduledBillingChange(): Promise<{
  scheduledPriceId: string | null;
  scheduledChangeDate: number | null;
  scheduledBillingPeriod: 'monthly' | 'annual' | null;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: customerData } = await supabase
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!customerData) {
    return null;
  }

  const { data: stripeData } = await supabase
    .from('stripe_subscriptions')
    .select('scheduled_price_id, scheduled_change_date')
    .eq('customer_id', customerData.customer_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!stripeData?.scheduled_price_id || !stripeData?.scheduled_change_date) {
    return null;
  }

  const { data: tierData } = await supabase
    .from('pro_credit_tiers')
    .select('stripe_price_id_monthly, stripe_price_id_annual')
    .or(`stripe_price_id_monthly.eq.${stripeData.scheduled_price_id},stripe_price_id_annual.eq.${stripeData.scheduled_price_id}`)
    .maybeSingle();

  if (!tierData) {
    return null;
  }

  let scheduledBillingPeriod: 'monthly' | 'annual' | null = null;
  if (tierData.stripe_price_id_monthly === stripeData.scheduled_price_id) {
    scheduledBillingPeriod = 'monthly';
  } else if (tierData.stripe_price_id_annual === stripeData.scheduled_price_id) {
    scheduledBillingPeriod = 'annual';
  }

  return {
    scheduledPriceId: stripeData.scheduled_price_id,
    scheduledChangeDate: stripeData.scheduled_change_date,
    scheduledBillingPeriod,
  };
}

export function formatCredits(credits: number): string {
  return credits.toLocaleString('en-US');
}
