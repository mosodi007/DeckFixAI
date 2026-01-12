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

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return corsResponse({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Try to get user with the provided token
    let {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    // If token validation fails (expired JWT), extract user ID from token and verify user exists
    if (getUserError && (getUserError.message?.includes('JWT') || getUserError.message?.includes('expired') || getUserError.message?.includes('Invalid'))) {
      console.log('Token validation failed, attempting to extract user ID from token');
      
      // Extract user ID from the JWT token payload
      const userIdFromToken = await extractUserIdFromToken(token);
      
      if (userIdFromToken) {
        // Verify user exists in database
        const { data: userData, error: userDataError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('id', userIdFromToken)
          .maybeSingle();
        
        if (userData && !userDataError) {
          // Create a user object from database data
          user = {
            id: userData.id,
            email: userData.email,
          } as any;
          getUserError = null;
          console.log(`Authenticated user ${userData.id} via token extraction`);
        } else {
          console.error('User not found in database:', userDataError);
        }
      } else {
        console.error('Could not extract user ID from token');
      }
    }

    if (getUserError) {
      console.error('Auth error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user', details: getUserError.message }, 401);
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
          .select('subscription_id, status, price_id, schedule_id, scheduled_price_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);

          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (subscription && subscription.subscription_id && subscription.status === 'active') {
          // User has an active subscription - update it instead of creating a new checkout session
          try {
            // First, verify the subscription exists in Stripe (handles test->live mode migration)
            let currentSub: Stripe.Subscription;
            try {
              currentSub = await stripe.subscriptions.retrieve(subscription.subscription_id);
            } catch (retrieveError: any) {
              // Subscription doesn't exist in current Stripe mode (likely test->live migration)
              if (retrieveError.type === 'StripeInvalidRequestError' && 
                  (retrieveError.code === 'resource_missing' || retrieveError.message?.includes('No such subscription'))) {
                console.log(`Subscription ${subscription.subscription_id} not found in Stripe. This may be due to test->live mode migration. Creating new checkout session.`);
                
                // Clear the invalid subscription from database
                await supabase
                  .from('stripe_subscriptions')
                  .update({
                    status: 'canceled',
                    deleted_at: new Date().toISOString(),
                  })
                  .eq('subscription_id', subscription.subscription_id);
                
                // Fall through to create a new checkout session
                // Break out of the try-catch to continue with checkout session creation
                throw new Error('SUBSCRIPTION_NOT_FOUND_IN_STRIPE');
              }
              throw retrieveError;
            }

            // If there's an existing schedule, cancel it first
            if (subscription.schedule_id) {
              try {
                console.log(`Cancelling existing subscription schedule ${subscription.schedule_id}`);
                await stripe.subscriptionSchedules.cancel(subscription.schedule_id);

                // Clear schedule fields in database
                await supabase
                  .from('stripe_subscriptions')
                  .update({
                    schedule_id: null,
                    scheduled_price_id: null,
                    scheduled_change_date: null,
                  })
                  .eq('subscription_id', subscription.subscription_id);

                console.log(`Cleared schedule for subscription ${subscription.subscription_id}`);
              } catch (scheduleError: any) {
                // Schedule might not exist, log and continue
                console.warn(`Could not cancel schedule ${subscription.schedule_id}:`, scheduleError.message);
              }
            }

            // Get the tier information for both current and new price
            const { data: currentTierData } = await supabase
              .from('pro_credit_tiers')
              .select('credits, stripe_price_id_monthly, stripe_price_id_annual')
              .or(`stripe_price_id_monthly.eq.${subscription.price_id},stripe_price_id_annual.eq.${subscription.price_id}`)
              .maybeSingle();

            const { data: newTierData } = await supabase
              .from('pro_credit_tiers')
              .select('credits, stripe_price_id_monthly, stripe_price_id_annual')
              .or(`stripe_price_id_monthly.eq.${price_id},stripe_price_id_annual.eq.${price_id}`)
              .maybeSingle();

            if (!currentTierData || !newTierData) {
              return corsResponse({ error: 'Failed to fetch tier information' }, 500);
            }

            const isDowngrade = newTierData.credits < currentTierData.credits;
            const isUpgrade = newTierData.credits > currentTierData.credits;
            const isSameTier = newTierData.credits === currentTierData.credits;

            // Detect billing period change
            const currentIsMonthly = subscription.price_id === currentTierData.stripe_price_id_monthly;
            const newIsMonthly = price_id === newTierData.stripe_price_id_monthly;
            const isBillingPeriodChange = isSameTier && (currentIsMonthly !== newIsMonthly);

            if (isBillingPeriodChange) {
              // For billing period changes, create a subscription schedule to change at the next renewal
              const currentPeriodEnd = currentSub.current_period_end;

              // Create a subscription schedule that changes the price at the next renewal
              const schedule = await stripe.subscriptionSchedules.create({
                from_subscription: subscription.subscription_id,
              });

              // Update the schedule to change the price at the next renewal
              await stripe.subscriptionSchedules.update(schedule.id, {
                phases: [
                  {
                    items: [{
                      price: subscription.price_id,
                      quantity: 1,
                    }],
                    start_date: currentSub.current_period_start,
                    end_date: currentPeriodEnd,
                  },
                  {
                    items: [{
                      price: price_id,
                      quantity: 1,
                    }],
                    start_date: currentPeriodEnd,
                  },
                ],
              });

              console.log(`Scheduled billing period change for subscription ${subscription.subscription_id} to take effect at ${new Date(currentPeriodEnd * 1000).toISOString()}`);

              // Update database with scheduled change information
              await supabase
                .from('stripe_subscriptions')
                .update({
                  schedule_id: schedule.id,
                  scheduled_price_id: price_id,
                  scheduled_change_date: currentPeriodEnd,
                })
                .eq('subscription_id', subscription.subscription_id);

              return corsResponse({
                sessionId: null,
                url: success_url,
                updated: true,
                isBillingPeriodChange: true,
                scheduledChange: true,
                scheduledDate: currentPeriodEnd,
              });
            } else if (isUpgrade) {
              const currentPeriodEnd = new Date(currentSub.current_period_end * 1000);
              const currentPeriodStart = new Date(currentSub.current_period_start * 1000);
              const now = new Date();

              const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

              const isAnnual = currentSub.items.data[0].price.recurring?.interval === 'year';
              const billingPeriod = isAnnual ? 'annual' : 'monthly';

              const { data: baseUpgradeCost, error: upgradeCostError } = await supabase.rpc('get_upgrade_cost', {
                p_from_credits: currentTierData.credits,
                p_to_credits: newTierData.credits,
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
                description: `Prorated upgrade from ${currentTierData.credits} to ${newTierData.credits} credits (${daysRemaining} days remaining)`,
                metadata: {
                  upgrade: 'true',
                  from_credits: currentTierData.credits.toString(),
                  to_credits: newTierData.credits.toString(),
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
            // If subscription not found in Stripe (test->live migration), create new checkout session
            if (updateError.message === 'SUBSCRIPTION_NOT_FOUND_IN_STRIPE') {
              console.log('Subscription not found in Stripe, proceeding to create new checkout session');
              // Continue execution to create a new checkout session below
            } else {
              console.error('Error updating subscription:', updateError);
              // For other errors, still try to create a checkout session as fallback
              console.log('Attempting to create new checkout session as fallback');
            }
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

// Helper function to extract user ID from JWT token (without verification)
async function extractUserIdFromToken(token: string): Promise<string | null> {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    // Replace URL-safe base64 characters
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    return payload.sub || payload.user_id || null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}

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
