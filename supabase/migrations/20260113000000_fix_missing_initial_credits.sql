/*
  # Fix Missing Initial Credits for New Users

  ## Problem
  - New users are not receiving 100 free credits on signup
  - The trigger may be failing silently or not executing properly

  ## Solution
  1. Verify and recreate the trigger if needed
  2. Backfill credits for users who don't have credit records
  3. Ensure the function handles all edge cases properly
*/

-- Step 1: Backfill credits for existing users who don't have credit records
DO $$
DECLARE
  user_record RECORD;
  free_plan_id uuid;
  free_credits integer := 100;
BEGIN
  -- Get the Free plan ID
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- Find all users who don't have credit records
  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
    )
  LOOP
    -- Initialize user credits with 100 free credits
    INSERT INTO public.user_credits (
      user_id,
      credits_balance,
      subscription_credits,
      purchased_credits,
      monthly_credits_allocated,
      credits_reset_date,
      subscription_tier,
      created_at,
      updated_at
    )
    VALUES (
      user_record.id,
      free_credits,
      free_credits,
      0,
      free_credits,
      (NOW() + INTERVAL '1 month'),
      COALESCE(free_plan_id::text, 'free'),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create initial transaction record if it doesn't exist
    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      balance_after,
      metadata,
      created_at
    )
    SELECT
      user_record.id,
      free_credits,
      'subscription_renewal',
      'Welcome bonus: Free plan credits',
      free_credits,
      jsonb_build_object('plan', 'free', 'initial_grant', true, 'backfilled', true),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM credit_transactions ct
      WHERE ct.user_id = user_record.id
      AND ct.metadata->>'initial_grant' = 'true'
    );

    RAISE NOTICE 'Backfilled credits for user: % (%)', user_record.email, user_record.id;
  END LOOP;
END $$;

-- Step 2: Ensure handle_new_user function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer := 100;
  v_referral_code_used text;
  v_referrer_id uuid;
  v_is_google_oauth boolean := false;
  v_is_verified boolean := false;
BEGIN
  -- Check if this is a Google OAuth signup
  v_is_google_oauth := (NEW.raw_app_meta_data->>'provider' = 'google');
  
  -- Google OAuth users are automatically verified (Google emails are pre-verified)
  -- Email/password users start as UNVERIFIED (false) until they confirm their email
  -- Only set to true if:
  -- 1. User signed up via Google OAuth (pre-verified)
  -- 2. User already has email_confirmed_at set (rare, but possible if email was confirmed before profile creation)
  v_is_verified := CASE
    WHEN v_is_google_oauth THEN true
    WHEN NEW.email_confirmed_at IS NOT NULL THEN true
    ELSE false  -- Default to false for email/password signups
  END;

  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, is_verified, created_at, updated_at, raw_user_meta_data)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    v_is_verified,
    NOW(),
    NOW(),
    NEW.raw_user_meta_data
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    is_verified = v_is_verified,
    updated_at = NOW();

  -- Get the Free plan ID
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  -- Initialize user credits with 100 free credits
  -- Use INSERT with explicit conflict handling to ensure credits are always created
  INSERT INTO public.user_credits (
    user_id,
    credits_balance,
    subscription_credits,
    purchased_credits,
    monthly_credits_allocated,
    credits_reset_date,
    subscription_tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    free_credits,
    free_credits,
    0,
    free_credits,
    (NOW() + INTERVAL '1 month'),
    COALESCE(free_plan_id::text, 'free'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    -- Only update if credits_balance is 0 or NULL (user hasn't used any credits yet)
    credits_balance = CASE 
      WHEN user_credits.credits_balance IS NULL OR user_credits.credits_balance = 0 
      THEN free_credits 
      ELSE user_credits.credits_balance 
    END,
    subscription_credits = CASE 
      WHEN user_credits.subscription_credits IS NULL OR user_credits.subscription_credits = 0 
      THEN free_credits 
      ELSE user_credits.subscription_credits 
    END,
    monthly_credits_allocated = CASE 
      WHEN user_credits.monthly_credits_allocated IS NULL OR user_credits.monthly_credits_allocated = 0 
      THEN free_credits 
      ELSE user_credits.monthly_credits_allocated 
    END,
    updated_at = NOW();

  -- Create initial transaction record for new signups (only if it doesn't exist)
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  )
  SELECT
    NEW.id,
    free_credits,
    'subscription_renewal',
    'Welcome bonus: Free plan credits',
    free_credits,
    jsonb_build_object('plan', 'free', 'initial_grant', true)
  WHERE NOT EXISTS (
    SELECT 1 FROM credit_transactions ct
    WHERE ct.user_id = NEW.id
    AND ct.metadata->>'initial_grant' = 'true'
  );

  -- Generate referral code for new user (if function exists)
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Referral code generation failed, but don't fail the signup
      RAISE WARNING 'Failed to generate referral code for user %: %', NEW.id, SQLERRM;
  END;

  -- Check if user signed up with a referral code
  v_referral_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code_used IS NOT NULL THEN
    BEGIN
      -- Validate and get referrer info
      SELECT rc.user_id INTO v_referrer_id
      FROM public.referral_codes rc
      WHERE rc.code = UPPER(TRIM(v_referral_code_used))
        AND rc.is_active = true
        AND rc.user_id != NEW.id; -- Prevent self-referral
      
      IF v_referrer_id IS NOT NULL THEN
        -- Create pending referral record
        INSERT INTO public.referrals (
          referrer_id,
          referred_id,
          referral_code,
          status,
          metadata
        )
        VALUES (
          v_referrer_id,
          NEW.id,
          UPPER(TRIM(v_referral_code_used)),
          'pending',
          jsonb_build_object(
            'signup_method', CASE WHEN v_is_google_oauth THEN 'google_oauth' ELSE 'email_password' END,
            'signup_time', NOW()
          )
        )
        ON CONFLICT DO NOTHING;
        
        -- Update user profile with referral info
        UPDATE public.user_profiles
        SET 
          referral_code_used = UPPER(TRIM(v_referral_code_used)),
          referred_by = v_referrer_id,
          updated_at = NOW()
        WHERE id = NEW.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Referral processing failed, but don't fail the signup
        RAISE WARNING 'Failed to process referral code for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    -- This ensures users can still sign up even if credit allocation fails
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and allocates 100 free credits when a new user signs up. Handles both email/password and OAuth signups.';

