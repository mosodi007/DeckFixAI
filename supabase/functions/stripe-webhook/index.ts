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
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
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
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    // Handle invoice payment for upgrades
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const hasUpgradeItem = invoice.lines.data.some(line =>
        line.metadata?.upgrade === 'true'
      );

      if (hasUpgradeItem) {
        console.info(`Detected upgrade invoice payment for customer: ${customerId}`);
        const upgradeLine = invoice.lines.data.find(line => line.metadata?.upgrade === 'true');
        if (upgradeLine?.metadata) {
          console.info(`Upgrade details: from ${upgradeLine.metadata.from_credits} to ${upgradeLine.metadata.to_credits} credits`);
          console.info(`Prorated cost: $${upgradeLine.metadata.prorated_cost} (base: $${upgradeLine.metadata.base_cost})`);
        }
      }
    }

    // Handle subscription updates and cancellations
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      console.info(`Syncing subscription for customer: ${customerId} due to ${event.type}`);
      await syncCustomerFromStripe(customerId);
      return;
    }

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
        // Get user_id from stripe customer
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

        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Get the line items to extract the price_id
        const session = await stripe.checkout.sessions.retrieve(checkout_session_id, {
          expand: ['line_items'],
        });

        const priceId = session.line_items?.data[0]?.price?.id;

        // Insert the order into the stripe_orders table
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

        // Allocate credits for the purchase
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

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // Get user_id from stripe customer
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerError || !customerData) {
      console.error('Error fetching user from stripe customer:', customerError);
      throw new Error('Failed to get user_id from stripe customer');
    }

    const userId = customerData.user_id;

    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: priceId,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    // Allocate credits if subscription is active
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await allocateCreditsForSubscription(userId, priceId, subscription.id);
    }

    // Handle subscription cancellation - reset user to free tier
    if (subscription.status === 'canceled') {
      console.info(`Subscription cancelled for user ${userId}, resetting to free tier`);

      const { error: resetError } = await supabase
        .from('user_credits')
        .update({
          monthly_credits_allocated: 100,
          subscription_tier: 'free',
        })
        .eq('user_id', userId);

      if (resetError) {
        console.error('Error resetting user to free tier:', resetError);
      }
    }

    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function allocateCreditsForSubscription(
  userId: string,
  priceId: string,
  subscriptionId: string
) {
  try {
    // Get credit amount from price_id
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

    // Check if we've already allocated credits for this subscription period
    const { data: existingTransaction } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('metadata->>subscription_id', subscriptionId)
      .eq('transaction_type', 'subscription_renewal')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingTransaction) {
      console.info(`Credits already allocated for subscription ${subscriptionId} in the last 24 hours`);
      return;
    }

    // Allocate credits
    const { error: allocateError } = await supabase.rpc(
      'allocate_credits_from_stripe',
      {
        p_user_id: userId,
        p_credits: creditAmount,
        p_transaction_type: 'subscription_renewal',
        p_stripe_metadata: {
          subscription_id: subscriptionId,
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
    // Get credit amount from price_id
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

    // Check if we've already allocated credits for this checkout session
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

    // Allocate credits
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