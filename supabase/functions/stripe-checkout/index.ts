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

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode } = await req.json();

    const error = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (error) {
      return corsResponse({ error }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);

      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    /**
     * In case we don't have a mapping yet, the customer does not exist and we need to create one.
     */
    if (!customer || !customer.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);

        // Try to clean up both the Stripe customer and subscription record
        try {
          await stripe.customers.del(newCustomer.id);
          await supabase.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up after customer mapping error:', deleteError);
        }

        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription in the database', createSubscriptionError);

          // Try to clean up the Stripe customer since we couldn't create the subscription
          try {
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('Failed to delete Stripe customer after subscription creation error:', deleteError);
          }

          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
      }

      customerId = newCustomer.id;

      console.log(`Successfully set up new customer ${customerId} with subscription record`);
    } else {
      customerId = customer.customer_id;

      if (mode === 'subscription') {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('subscription_id, status, price_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);

          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (subscription && subscription.subscription_id && subscription.status === 'active') {
          // User has an active subscription - update it instead of creating a new checkout session
          try {
            const currentSub = await stripe.subscriptions.retrieve(subscription.subscription_id);

            // Get the tier information for both current and new price
            const { data: currentTier } = await supabase
              .from('pro_credit_tiers')
              .select('credits')
              .or(`stripe_price_id_monthly.eq.${subscription.price_id},stripe_price_id_annual.eq.${subscription.price_id}`)
              .maybeSingle();

            const { data: newTier } = await supabase
              .from('pro_credit_tiers')
              .select('credits')
              .or(`stripe_price_id_monthly.eq.${price_id},stripe_price_id_annual.eq.${price_id}`)
              .maybeSingle();

            const isDowngrade = newTier && currentTier && newTier.credits < currentTier.credits;
            const isUpgrade = newTier && currentTier && newTier.credits > currentTier.credits;

            if (isUpgrade) {
              const currentPeriodEnd = new Date(currentSub.current_period_end * 1000);
              const currentPeriodStart = new Date(currentSub.current_period_start * 1000);
              const now = new Date();

              const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

              const isAnnual = currentSub.items.data[0].price.recurring?.interval === 'year';
              const billingPeriod = isAnnual ? 'annual' : 'monthly';

              const { data: baseUpgradeCost, error: upgradeCostError } = await supabase.rpc('get_upgrade_cost', {
                p_from_credits: currentTier.credits,
                p_to_credits: newTier.credits,
                p_billing_period: billingPeriod,
              });

              if (upgradeCostError || !baseUpgradeCost) {
                console.error('Error getting upgrade cost:', upgradeCostError);
                return corsResponse({ error: 'Failed to calculate upgrade cost' }, 500);
              }

              const { data: proratedCost, error: proratedError } = await supabase.rpc('calculate_prorated_upgrade', {
                p_upgrade_cost: parseFloat(baseUpgradeCost),
                p_days_remaining: daysRemaining,
                p_total_days: totalDays,
              });

              if (proratedError) {
                console.error('Error calculating prorated cost:', proratedError);
                return corsResponse({ error: 'Failed to calculate prorated cost' }, 500);
              }

              const finalUpgradeCost = parseFloat(proratedCost || baseUpgradeCost);

              await stripe.invoiceItems.create({
                customer: customerId,
                amount: Math.round(finalUpgradeCost * 100),
                currency: 'usd',
                description: `Prorated upgrade from ${currentTier.credits} to ${newTier.credits} credits (${daysRemaining} days remaining)`,
                metadata: {
                  upgrade: 'true',
                  from_credits: currentTier.credits.toString(),
                  to_credits: newTier.credits.toString(),
                  base_cost: baseUpgradeCost.toString(),
                  prorated_cost: finalUpgradeCost.toString(),
                  days_remaining: daysRemaining.toString(),
                },
              });

              await stripe.subscriptions.update(subscription.subscription_id, {
                items: [{
                  id: currentSub.items.data[0].id,
                  price: price_id,
                }],
                proration_behavior: 'none',
              });

              const invoice = await stripe.invoices.create({
                customer: customerId,
                auto_advance: true,
              });

              await stripe.invoices.finalizeInvoice(invoice.id);
              await stripe.invoices.pay(invoice.id);

              console.log(`Processed upgrade with prorated cost $${finalUpgradeCost} for subscription ${subscription.subscription_id}`);
            } else {
              await stripe.subscriptions.update(subscription.subscription_id, {
                items: [{
                  id: currentSub.items.data[0].id,
                  price: price_id,
                }],
                proration_behavior: isDowngrade ? 'none' : 'always_invoice',
                billing_cycle_anchor: isDowngrade ? 'unchanged' : undefined,
              });

              console.log(`Updated subscription ${subscription.subscription_id} to price ${price_id}`);
            }

            // Update database
            await supabase
              .from('stripe_subscriptions')
              .update({
                price_id: price_id,
              })
              .eq('subscription_id', subscription.subscription_id);

            // Return success URL directly since we don't need a checkout session
            return corsResponse({
              sessionId: null,
              url: success_url,
              updated: true,
              isDowngrade,
              isUpgrade
            });
          } catch (updateError: any) {
            console.error('Error updating subscription:', updateError);
            return corsResponse({ error: 'Failed to update subscription' }, 500);
          }
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record for existing customer', createSubscriptionError);

            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
        }
      }
    }

    // create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
    });

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error:`, error);
    return corsResponse({
      error: error.message || 'Unknown error',
      details: error.type || 'unknown',
      raw: error.toString()
    }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}