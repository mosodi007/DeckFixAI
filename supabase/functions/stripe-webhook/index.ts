import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Error:`, error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});

async function handleEvent(event: Stripe.Event) {
  console.info(`Processing webhook event: ${event.type}`);

  const allowedEvents = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
  ];

  if (!allowedEvents.includes(event.type)) {
    console.info(`Ignoring event type: ${event.type}`);
    return;
  }

  const stripeData = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;

  if (!('customer' in stripeData) || !stripeData.customer) {
    console.warn(`No customer found for event: ${event.type}`);
    return;
  }

  const customerId = stripeData.customer as string;
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!customer) {
    console.warn(`No user mapping found for customer: ${customerId}`);
    return;
  }

  const userId = customer.user_id;

  if (event.type === 'customer.subscription.deleted') {
    await supabase
      .from('stripe_subscriptions')
      .update({ status: 'canceled', deleted_at: new Date().toISOString() })
      .eq('customer_id', customerId);

    await supabase
      .from('user_credits')
      .update({ subscription_tier: 'free', monthly_credits_allocated: 0 })
      .eq('user_id', userId);

    console.info(`Subscription deleted for customer: ${customerId}`);
    return;
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'invoice.paid' ||
    event.type === 'invoice.payment_failed'
  ) {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (customerError || !customerData) {
          console.error('Error fetching user from stripe customer:', customerError);
          return;
        }

        const userId = customerData.user_id;

        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        const session = await stripe.checkout.sessions.retrieve(checkout_session_id, {
          expand: ['line_items'],
        });

        const priceId = session.line_items?.data[0]?.price?.id;

        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }

        if (priceId) {
          await allocateCreditsForOneTimePayment(userId, priceId, checkout_session_id);
        }

        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      expand: ['data.default_payment_method'],
      limit: 1,
    });

    if (!subscriptions.data.length) {
      console.info(`No subscriptions found for customer: ${customerId}`);
      return;
    }

    const subscription = subscriptions.data[0];

    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError || !customerData) {
      console.error('Error fetching user from stripe customer:', customerError);
      return;
    }

    const userId = customerData.user_id;

    const paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod | undefined;
    const cardBrand = paymentMethod?.card?.brand || null;
    const cardLast4 = paymentMethod?.card?.last4 || null;

    const subscriptionData = {
      customer_id: customerId,
      subscription_id: subscription.id,
      price_id: subscription.items.data[0].price.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method_brand: cardBrand,
      payment_method_last4: cardLast4,
      status: subscription.status,
    };

    const { error: upsertError } = await supabase
      .from('stripe_subscriptions')
      .upsert(subscriptionData, { onConflict: 'customer_id' });

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError);
      return;
    }

    console.info(`Successfully synced subscription for customer: ${customerId}`);

    const priceId = subscription.items.data[0].price.id;
    const currentPeriodStart = subscription.current_period_start;
    const currentPeriodEnd = subscription.current_period_end;

    await allocateCreditsForSubscription(userId, priceId, subscription.id, currentPeriodStart, currentPeriodEnd);
  } catch (error) {
    console.error('Error syncing customer from Stripe:', error);
    throw error;
  }
}

async function allocateCreditsForSubscription(
  userId: string,
  priceId: string,
  subscriptionId: string,
  periodStart: number,
  periodEnd: number
) {
  try {
    const { data: existingPeriod } = await supabase
      .from('subscription_credit_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (existingPeriod) {
      console.info(`Credits already allocated for period ${periodStart}-${periodEnd}`);
      return;
    }

    const { data: tierData, error: tierError } = await supabase
      .from('pro_credit_tiers')
      .select('credits')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .maybeSingle();

    if (tierError || !tierData) {
      console.error('Error fetching tier data:', tierError);
      throw new Error('Failed to get tier information');
    }

    const creditAmount = tierData.credits;

    const { error: allocateError } = await supabase.rpc(
      'allocate_credits_from_stripe',
      {
        p_user_id: userId,
        p_credits: creditAmount,
        p_transaction_type: 'subscription_renewal',
        p_stripe_metadata: {
          subscription_id: subscriptionId,
          price_id: priceId,
          period_start: periodStart,
          period_end: periodEnd,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (allocateError) {
      console.error('Error allocating credits:', allocateError);
      throw new Error('Failed to allocate credits');
    }

    const { error: periodError } = await supabase.from('subscription_credit_periods').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      period_start: periodStart,
      period_end: periodEnd,
      credits_allocated: creditAmount,
    });

    if (periodError) {
      console.error('Error recording credit period:', periodError);
    }

    console.info(`Successfully allocated ${creditAmount} credits to user ${userId}`);
  } catch (error) {
    console.error('Error in allocateCreditsForSubscription:', error);
    throw error;
  }
}

async function allocateCreditsForOneTimePayment(
  userId: string,
  priceId: string,
  checkoutSessionId: string
) {
  try {
    const { data: upgradeData } = await supabase
      .from('tier_upgrade_pricing')
      .select('to_tier_credits, stripe_price_id_monthly, stripe_price_id_annual')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .maybeSingle();

    if (upgradeData) {
      console.info(`Processing tier upgrade payment for ${upgradeData.to_tier_credits} credits`);

      const { data: customerData } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!customerData) {
        console.error('No customer found for user:', userId);
        return;
      }

      const { data: newTier } = await supabase
        .from('pro_credit_tiers')
        .select('stripe_price_id_monthly, stripe_price_id_annual')
        .eq('credits', upgradeData.to_tier_credits)
        .maybeSingle();

      if (!newTier) {
        console.error('No tier found for credits:', upgradeData.to_tier_credits);
        return;
      }

      const { data: currentSub } = await supabase
        .from('stripe_subscriptions')
        .select('subscription_id, price_id')
        .eq('customer_id', customerData.customer_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!currentSub || !currentSub.subscription_id) {
        console.error('No active subscription found for customer:', customerData.customer_id);
        return;
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.subscription_id);
      const isAnnual = stripeSubscription.items.data[0].price.recurring?.interval === 'year';
      const newPriceId = isAnnual ? newTier.stripe_price_id_annual : newTier.stripe_price_id_monthly;

      await stripe.subscriptions.update(currentSub.subscription_id, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'none',
      });

      await supabase
        .from('stripe_subscriptions')
        .update({ price_id: newPriceId })
        .eq('subscription_id', currentSub.subscription_id);

      console.info(`Successfully upgraded subscription ${currentSub.subscription_id} to ${upgradeData.to_tier_credits} credits tier`);

      // Immediately sync to allocate the new tier's credits
      await syncCustomerFromStripe(customerData.customer_id);
      return;
    }

    const { data: creditAmount, error: creditError } = await supabase.rpc(
      'get_credits_from_price_id',
      { price_id: priceId }
    );

    if (creditError) {
      console.error('Error getting credits from price_id:', creditError);
      throw new Error('Failed to get credit amount');
    }

    if (!creditAmount || creditAmount === 0) {
      console.warn(`No credits found for price_id: ${priceId}`);
      return;
    }

    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('metadata->>checkout_session_id', checkoutSessionId)
      .eq('transaction_type', 'purchase')
      .maybeSingle();

    if (existingTransaction) {
      console.info(`Credits already allocated for checkout session ${checkoutSessionId}`);
      return;
    }

    const { error: allocateError } = await supabase.rpc(
      'allocate_credits_from_stripe',
      {
        p_user_id: userId,
        p_credits: creditAmount,
        p_transaction_type: 'purchase',
        p_stripe_metadata: {
          checkout_session_id: checkoutSessionId,
          price_id: priceId,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (allocateError) {
      console.error('Error allocating credits:', allocateError);
      throw new Error('Failed to allocate credits');
    }

    console.info(`Successfully allocated ${creditAmount} credits to user ${userId}`);
  } catch (error) {
    console.error('Error in allocateCreditsForOneTimePayment:', error);
    throw error;
  }
}