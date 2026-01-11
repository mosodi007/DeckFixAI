import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return corsResponse({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('User authenticated:', !!user, 'Error:', authError?.message);

    if (authError || !user) {
      return corsResponse({ error: 'Unauthorized: ' + (authError?.message || 'No user found') }, 401);
    }

    const { target_price_id } = await req.json();
    console.log('Target price ID:', target_price_id);

    if (!target_price_id) {
      return corsResponse({ error: 'Missing target_price_id' }, 400);
    }

    // Get user's Stripe customer ID first
    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return corsResponse({ error: 'Failed to fetch customer data' }, 500);
    }

    if (!customer || !customer.customer_id) {
      return corsResponse({ error: 'No Stripe customer found' }, 404);
    }

    // Get user's current subscription using customer_id
    const { data: subscription, error: subError } = await supabase
      .from('stripe_subscriptions')
      .select('subscription_id, price_id, status')
      .eq('customer_id', customer.customer_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return corsResponse({ error: 'Failed to fetch subscription' }, 500);
    }

    if (!subscription || !subscription.subscription_id) {
      return corsResponse({ error: 'No active subscription found' }, 404);
    }

    // Get current and target tier information
    const { data: currentTier, error: currentTierError } = await supabase
      .from('pro_credit_tiers')
      .select('id, credits, price_monthly, price_annual, stripe_price_id_monthly, stripe_price_id_annual')
      .or(`stripe_price_id_monthly.eq.${subscription.price_id},stripe_price_id_annual.eq.${subscription.price_id}`)
      .maybeSingle();

    if (currentTierError || !currentTier) {
      console.error('Error fetching current tier:', currentTierError);
      return corsResponse({ error: 'Failed to fetch current tier' }, 500);
    }

    const { data: targetTier, error: targetTierError } = await supabase
      .from('pro_credit_tiers')
      .select('id, credits, price_monthly, price_annual, stripe_price_id_monthly, stripe_price_id_annual')
      .or(`stripe_price_id_monthly.eq.${target_price_id},stripe_price_id_annual.eq.${target_price_id}`)
      .maybeSingle();

    if (targetTierError || !targetTier) {
      console.error('Error fetching target tier:', targetTierError);
      return corsResponse({ error: 'Failed to fetch target tier' }, 500);
    }

    // Determine if this is an upgrade or downgrade
    const isUpgrade = targetTier.credits > currentTier.credits;
    const isDowngrade = targetTier.credits < currentTier.credits;
    const isSameTier = targetTier.credits === currentTier.credits;

    if (isSameTier) {
      return corsResponse({ error: 'Target tier is the same as current tier' }, 400);
    }

    if (isDowngrade) {
      return corsResponse({
        isDowngrade: true,
        currentTier: {
          credits: currentTier.credits,
          price_monthly: parseFloat(currentTier.price_monthly),
          price_annual: parseFloat(currentTier.price_annual),
        },
        targetTier: {
          credits: targetTier.credits,
          price_monthly: parseFloat(targetTier.price_monthly),
          price_annual: parseFloat(targetTier.price_annual),
        },
        message: 'Downgrade will take effect at the end of your current billing period',
      });
    }

    // Fetch Stripe subscription to get billing cycle info
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription_id);
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    const now = new Date();

    // Calculate days remaining and total days in billing cycle
    const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

    // Determine billing period
    const isAnnual = stripeSubscription.items.data[0].price.recurring?.interval === 'year';
    const billingPeriod = isAnnual ? 'annual' : 'monthly';

    // Get base upgrade cost from database
    const { data: upgradeCostData, error: upgradeCostError } = await supabase.rpc('get_upgrade_cost', {
      p_from_credits: currentTier.credits,
      p_to_credits: targetTier.credits,
      p_billing_period: billingPeriod,
    });

    if (upgradeCostError) {
      console.error('Error getting upgrade cost:', upgradeCostError);
      return corsResponse({ error: 'Failed to calculate upgrade cost' }, 500);
    }

    const baseUpgradeCost = parseFloat(upgradeCostData || '0');

    if (baseUpgradeCost === 0) {
      return corsResponse({ error: 'Upgrade pricing not configured for this tier combination' }, 400);
    }

    // Calculate prorated amount
    const { data: proratedCost, error: proratedError } = await supabase.rpc('calculate_prorated_upgrade', {
      p_upgrade_cost: baseUpgradeCost,
      p_days_remaining: daysRemaining,
      p_total_days: totalDays,
    });

    if (proratedError) {
      console.error('Error calculating prorated cost:', proratedError);
      return corsResponse({ error: 'Failed to calculate prorated cost' }, 500);
    }

    const finalUpgradeCost = parseFloat(proratedCost || baseUpgradeCost.toString());

    return corsResponse({
      isUpgrade: true,
      currentTier: {
        credits: currentTier.credits,
        price_monthly: parseFloat(currentTier.price_monthly),
        price_annual: parseFloat(currentTier.price_annual),
      },
      targetTier: {
        credits: targetTier.credits,
        price_monthly: parseFloat(targetTier.price_monthly),
        price_annual: parseFloat(targetTier.price_annual),
      },
      billingPeriod,
      baseUpgradeCost,
      proratedUpgradeCost: finalUpgradeCost,
      daysRemaining,
      totalDays,
      nextBillingDate: currentPeriodEnd.toISOString(),
      proratedPercentage: Math.round((daysRemaining / totalDays) * 100),
    });
  } catch (error: any) {
    console.error('Error in get-upgrade-preview:', error);
    return corsResponse({ error: error.message || 'Internal server error' }, 500);
  }
});