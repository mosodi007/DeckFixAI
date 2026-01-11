/*
  # Add Stripe Price IDs for One-Time Upgrade Payments

  1. Changes
    - Add `stripe_price_id_monthly` column to tier_upgrade_pricing
    - Add `stripe_price_id_annual` column to tier_upgrade_pricing
    - Update all existing records with the corresponding Stripe one-time price IDs

  2. Data Updates
    Monthly one-time upgrade price IDs:
    - 500 to 1,000: price_1SoOCLHJtj9hmvRfz0b7UfyP ($8)
    - 500 to 2,000: price_1SoOCwHJtj9hmvRfotRVmwHn ($24)
    - 500 to 5,000: price_1SoODPHJtj9hmvRfRLZYYxTr ($65)
    - 500 to 10,000: price_1SoODoHJtj9hmvRfngBO2ZcA ($130)
    - 1,000 to 2,000: price_1SoOEGHJtj9hmvRfJPEpIuCD ($16)
    - 1,000 to 5,000: price_1SoOElHJtj9hmvRf4VRTLXqS ($57)
    - 1,000 to 10,000: price_1SoOFIHJtj9hmvRf9MOCsXQj ($122)
    - 2,000 to 5,000: price_1SoOFpHJtj9hmvRfrmQrIxZF ($41)
    - 2,000 to 10,000: price_1SoOGFHJtj9hmvRfAWuXNdOe ($106)
    - 5,000 to 10,000: price_1SoOGmHJtj9hmvRfrgit8hj5 ($65)

    Annual one-time upgrade price IDs:
    - 500 to 1,000: price_1SoOHiHJtj9hmvRfmZwPnqE9 ($76.80)
    - 500 to 2,000: price_1SoOI2HJtj9hmvRf4OUldLzn ($230.40)
    - 500 to 5,000: price_1SoOILHJtj9hmvRfrIr4F0rT ($624.00)
    - 500 to 10,000: price_1SoOIhHJtj9hmvRfjxRHsrNW ($1248.00)
    - 1,000 to 2,000: price_1SoOJ1HJtj9hmvRfO2nVb7Yh ($153.60)
    - 1,000 to 5,000: price_1SoOJKHJtj9hmvRfA6sEFgIv ($547.20)
    - 1,000 to 10,000: price_1SoOJkHJtj9hmvRfEFUCANr3 ($1171.20)
    - 2,000 to 5,000: price_1SoOKCHJtj9hmvRfGrmwXl2Z ($393.60)
    - 2,000 to 10,000: price_1SoOKUHJtj9hmvRfoRLrmn4y ($1017.60)
    - 5,000 to 10,000: price_1SoOL0HJtj9hmvRfIVi0C2is ($624.00)
*/

-- Add columns for Stripe one-time price IDs
ALTER TABLE tier_upgrade_pricing 
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
ADD COLUMN IF NOT EXISTS stripe_price_id_annual text;

-- Update records with monthly one-time price IDs
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOCLHJtj9hmvRfz0b7UfyP' WHERE from_tier_credits = 500 AND to_tier_credits = 1000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOCwHJtj9hmvRfotRVmwHn' WHERE from_tier_credits = 500 AND to_tier_credits = 2000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoODPHJtj9hmvRfRLZYYxTr' WHERE from_tier_credits = 500 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoODoHJtj9hmvRfngBO2ZcA' WHERE from_tier_credits = 500 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOEGHJtj9hmvRfJPEpIuCD' WHERE from_tier_credits = 1000 AND to_tier_credits = 2000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOElHJtj9hmvRf4VRTLXqS' WHERE from_tier_credits = 1000 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOFIHJtj9hmvRf9MOCsXQj' WHERE from_tier_credits = 1000 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOFpHJtj9hmvRfrmQrIxZF' WHERE from_tier_credits = 2000 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOGFHJtj9hmvRfAWuXNdOe' WHERE from_tier_credits = 2000 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_monthly = 'price_1SoOGmHJtj9hmvRfrgit8hj5' WHERE from_tier_credits = 5000 AND to_tier_credits = 10000;

-- Update records with annual one-time price IDs
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOHiHJtj9hmvRfmZwPnqE9' WHERE from_tier_credits = 500 AND to_tier_credits = 1000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOI2HJtj9hmvRf4OUldLzn' WHERE from_tier_credits = 500 AND to_tier_credits = 2000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOILHJtj9hmvRfrIr4F0rT' WHERE from_tier_credits = 500 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOIhHJtj9hmvRfjxRHsrNW' WHERE from_tier_credits = 500 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOJ1HJtj9hmvRfO2nVb7Yh' WHERE from_tier_credits = 1000 AND to_tier_credits = 2000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOJKHJtj9hmvRfA6sEFgIv' WHERE from_tier_credits = 1000 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOJkHJtj9hmvRfEFUCANr3' WHERE from_tier_credits = 1000 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOKCHJtj9hmvRfGrmwXl2Z' WHERE from_tier_credits = 2000 AND to_tier_credits = 5000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOKUHJtj9hmvRfoRLrmn4y' WHERE from_tier_credits = 2000 AND to_tier_credits = 10000;
UPDATE tier_upgrade_pricing SET stripe_price_id_annual = 'price_1SoOL0HJtj9hmvRfIVi0C2is' WHERE from_tier_credits = 5000 AND to_tier_credits = 10000;
