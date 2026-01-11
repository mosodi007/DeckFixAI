# Stripe Integration - Implementation Complete

## What Was Done

### 1. Database Integration (Migration: `add_stripe_integration_to_credits`)

**Created database functions:**
- `get_credits_from_price_id(price_id text)` - Maps Stripe price IDs to credit amounts
- `allocate_credits_from_stripe(...)` - Handles credit allocation from Stripe payments with idempotency

**Added indexes for performance:**
- `idx_stripe_customers_customer_id`
- `idx_stripe_subscriptions_customer_id`
- `idx_stripe_subscriptions_subscription_id`

**Added RLS policies:**
- Service role can now manage credits via webhooks
- Service role can manage stripe_customers, stripe_subscriptions, and stripe_orders tables

### 2. Stripe Webhook Function (Updated)

**New functionality:**
- Automatically gets user_id from Stripe customer_id
- Retrieves credit amount from price_id using the database function
- Allocates credits for both:
  - **Subscription payments** - Adds monthly credits to subscription_credits
  - **One-time purchases** - Adds credits to purchased_credits
- Implements idempotency checks to prevent duplicate credit allocations
- Logs all credit transactions with metadata

**Functions added:**
- `allocateCreditsForSubscription()` - Handles subscription credit allocation
- `allocateCreditsForOneTimePayment()` - Handles one-time credit pack purchases

### 3. Frontend Stripe Service (New File)

**Created:** `src/services/stripeService.ts`

**Features:**
- `createCheckoutSession()` - Creates Stripe checkout sessions via edge function
- `redirectToCheckout()` - Redirects user to Stripe checkout page
- `getSuccessUrl()` and `getCancelUrl()` - Helper functions for redirect URLs
- Handles authentication and error states

### 4. Updated PricingView Component

**Added functionality:**
- "Upgrade to Pro" button now creates Stripe checkout sessions
- Loading states during checkout creation
- Error messages for failed checkouts
- Login requirement detection
- Validates selected tier has Stripe price IDs configured

## What Still Needs Configuration

### Critical: Add Stripe Price IDs to Database

You need to create products and prices in Stripe Dashboard, then add those price IDs to your database.

#### Option 1: Update pro_credit_tiers directly in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Update with your actual Stripe Price IDs from Stripe Dashboard
UPDATE pro_credit_tiers SET
  stripe_price_id_monthly = 'price_xxx_monthly_500',
  stripe_price_id_annual = 'price_xxx_annual_500'
WHERE credits = 500;

UPDATE pro_credit_tiers SET
  stripe_price_id_monthly = 'price_xxx_monthly_1000',
  stripe_price_id_annual = 'price_xxx_annual_1000'
WHERE credits = 1000;

UPDATE pro_credit_tiers SET
  stripe_price_id_monthly = 'price_xxx_monthly_2000',
  stripe_price_id_annual = 'price_xxx_annual_2000'
WHERE credits = 2000;

UPDATE pro_credit_tiers SET
  stripe_price_id_monthly = 'price_xxx_monthly_5000',
  stripe_price_id_annual = 'price_xxx_annual_5000'
WHERE credits = 5000;

UPDATE pro_credit_tiers SET
  stripe_price_id_monthly = 'price_xxx_monthly_10000',
  stripe_price_id_annual = 'price_xxx_annual_10000'
WHERE credits = 10000;
```

#### Option 2: For one-time credit packages

```sql
-- Update credit_packages with Stripe price IDs
UPDATE credit_packages SET stripe_price_id = 'price_xxx_100' WHERE credits = 100;
UPDATE credit_packages SET stripe_price_id = 'price_xxx_250' WHERE credits = 250;
UPDATE credit_packages SET stripe_price_id = 'price_xxx_600' WHERE credits = 600;
UPDATE credit_packages SET stripe_price_id = 'price_xxx_1500' WHERE credits = 1500;
```

### Steps to Create Prices in Stripe:

1. Go to Stripe Dashboard → Products
2. Create a product: "Pro Plan - 500 Credits/month"
3. Add two prices:
   - Monthly: $9.99 recurring monthly
   - Annual: $95.90 recurring yearly
4. Copy the price IDs (they start with `price_`)
5. Update the database with these IDs
6. Repeat for all credit tiers

### Configure Stripe Webhook

Your webhook endpoint is already deployed at:
```
https://audiyirmnexdylvocday.supabase.co/functions/v1/stripe-webhook
```

**In Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Add endpoint URL: `https://audiyirmnexdylvocday.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

**Note:** Your webhook secret is already configured in the `.env` file.

## How It Works

### Subscription Flow:
1. User clicks "Upgrade to Pro" on pricing page
2. Frontend calls `stripe-checkout` edge function
3. Edge function creates Stripe checkout session
4. User completes payment on Stripe
5. Stripe webhook receives `checkout.session.completed` event
6. Webhook extracts customer_id and price_id
7. Webhook looks up user_id from stripe_customers table
8. Webhook calls `get_credits_from_price_id()` to get credit amount
9. Webhook calls `allocate_credits_from_stripe()` to add credits
10. Credits are added to user's account
11. Transaction is logged in credit_transactions table

### One-Time Purchase Flow:
1. Similar to subscription, but mode is 'payment' instead of 'subscription'
2. Credits are added to `purchased_credits` instead of `subscription_credits`
3. No recurring billing

## Testing

### Test in Stripe Test Mode:

1. Make sure you're using test API keys (sk_test_...)
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Any future expiry date and any CVC
3. Click "Upgrade to Pro" on pricing page
4. Complete checkout with test card
5. Check your Supabase database:
   - `user_credits` table should show increased balance
   - `credit_transactions` table should have a new entry
   - `stripe_subscriptions` table should have subscription details

### Verify Webhook:

In Stripe Dashboard → Webhooks → Your webhook:
- Check "Recent deliveries" tab
- Should show successful 200 responses
- If errors, check logs in Supabase Functions

## Security Features

✓ Webhook signature verification (prevents fake webhooks)
✓ Idempotency checks (prevents duplicate credit allocations)
✓ Service role policies for credit management
✓ User authentication required for checkout
✓ Price ID validation before checkout

## Next Steps

1. **Add Stripe Price IDs** to your database (see SQL above)
2. **Test the flow** with Stripe test cards
3. **Monitor webhook logs** in Supabase Functions dashboard
4. **Check credit allocations** in your database after test purchases
5. **Switch to live mode** when ready (update API keys in Supabase dashboard)

## Notes

- The webhook has been deployed with the correct environment variables
- All database migrations have been applied
- The frontend is ready to use
- Just needs Stripe price IDs to be configured

## Troubleshooting

**If checkout button shows error about price IDs:**
- You need to add Stripe price IDs to the database (see above)

**If webhook isn't allocating credits:**
- Check Stripe webhook delivery logs
- Check Supabase Functions logs
- Verify price IDs in database match Stripe price IDs

**If user isn't linked to Stripe customer:**
- The `stripe-checkout` function automatically creates the link
- Check `stripe_customers` table for the mapping
