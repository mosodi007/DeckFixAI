/*
  # Add Scheduled Billing Period Changes Tracking

  1. Updates to stripe_subscriptions table
    - Add `schedule_id` (text) - Stripe subscription schedule ID
    - Add `scheduled_price_id` (text) - The price ID that will take effect at next renewal
    - Add `scheduled_change_date` (bigint) - Unix timestamp when the scheduled change takes effect

  2. Purpose
    - Track when users schedule billing period changes (monthly ↔ annual)
    - Show users when their scheduled change will take effect
    - Prevent duplicate scheduling and provide clear UI feedback
    
  3. Notes
    - These fields are nullable as not all subscriptions have scheduled changes
    - The webhook will clear these fields when the schedule executes
*/

-- Add fields to track scheduled billing period changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'schedule_id'
  ) THEN
    ALTER TABLE stripe_subscriptions ADD COLUMN schedule_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'scheduled_price_id'
  ) THEN
    ALTER TABLE stripe_subscriptions ADD COLUMN scheduled_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_subscriptions' AND column_name = 'scheduled_change_date'
  ) THEN
    ALTER TABLE stripe_subscriptions ADD COLUMN scheduled_change_date bigint;
  END IF;
END $$;

-- Add index for schedule lookups
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_schedule_id ON stripe_subscriptions(schedule_id) WHERE schedule_id IS NOT NULL;