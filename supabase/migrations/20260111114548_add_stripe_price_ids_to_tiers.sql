/*
  # Add Stripe Price IDs to Pro Credit Tiers

  1. Updates
    - Update all pro_credit_tiers records with correct Stripe price IDs
    - Maps monthly and annual price IDs for each credit tier

  2. Mappings
    - 500 credits:
      - Monthly: price_1SoMKmHJtj9hmvRfR7QVv0UH ($9.99/month)
      - Annual: price_1SoMVqHJtj9hmvRf5rAPfrws ($95.90/year)
    
    - 1,000 credits:
      - Monthly: price_1SoMLpHJtj9hmvRfYDFoR7ru ($17.99/month)
      - Annual: price_1SoMY8HJtj9hmvRfA1bQX4x2 ($172.70/year)
    
    - 2,000 credits:
      - Monthly: price_1SoMO6HJtj9hmvRfoIRqZXz2 ($33.99/month)
      - Annual: price_1SoMZIHJtj9hmvRfvAMzJuNw ($326.30/year)
    
    - 5,000 credits:
      - Monthly: price_1SoMRKHJtj9hmvRf5YjizXFL ($74.99/month)
      - Annual: price_1SoMaIHJtj9hmvRfaWfekpc3 ($719.90/year)
    
    - 10,000 credits:
      - Monthly: price_1SoMTGHJtj9hmvRfSF2IqmEO ($139.99/month)
      - Annual: price_1SoMbLHJtj9hmvRfvMUZZV0a ($1,343.90/year)

  3. Notes
    - Price IDs are from Stripe Dashboard export on 2026-01-11
    - All prices include ~20% discount for annual billing
    - Tax code: txcd_10103000 (Software as a service)
*/

-- Update 500 credits tier
UPDATE pro_credit_tiers
SET 
  stripe_price_id_monthly = 'price_1SoMKmHJtj9hmvRfR7QVv0UH',
  stripe_price_id_annual = 'price_1SoMVqHJtj9hmvRf5rAPfrws',
  updated_at = now()
WHERE credits = 500;

-- Update 1,000 credits tier
UPDATE pro_credit_tiers
SET 
  stripe_price_id_monthly = 'price_1SoMLpHJtj9hmvRfYDFoR7ru',
  stripe_price_id_annual = 'price_1SoMY8HJtj9hmvRfA1bQX4x2',
  updated_at = now()
WHERE credits = 1000;

-- Update 2,000 credits tier
UPDATE pro_credit_tiers
SET 
  stripe_price_id_monthly = 'price_1SoMO6HJtj9hmvRfoIRqZXz2',
  stripe_price_id_annual = 'price_1SoMZIHJtj9hmvRfvAMzJuNw',
  updated_at = now()
WHERE credits = 2000;

-- Update 5,000 credits tier
UPDATE pro_credit_tiers
SET 
  stripe_price_id_monthly = 'price_1SoMRKHJtj9hmvRf5YjizXFL',
  stripe_price_id_annual = 'price_1SoMaIHJtj9hmvRfaWfekpc3',
  updated_at = now()
WHERE credits = 5000;

-- Update 10,000 credits tier
UPDATE pro_credit_tiers
SET 
  stripe_price_id_monthly = 'price_1SoMTGHJtj9hmvRfSF2IqmEO',
  stripe_price_id_annual = 'price_1SoMbLHJtj9hmvRfvMUZZV0a',
  updated_at = now()
WHERE credits = 10000;
