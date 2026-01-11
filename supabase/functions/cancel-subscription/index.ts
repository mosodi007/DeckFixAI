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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError || !customerData) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select('subscription_id, status')
      .eq('customer_id', customerData.customer_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError || !subscriptionData || !subscriptionData.subscription_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscription = await stripe.subscriptions.update(subscriptionData.subscription_id, {
      cancel_at_period_end: true,
    });

    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('subscription_id', subscriptionData.subscription_id);

    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at: subscription.cancel_at,
        current_period_end: subscription.current_period_end,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to cancel subscription',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
