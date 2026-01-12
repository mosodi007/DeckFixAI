/*
  # Add is_verified Column to User Profiles

  ## Overview
  Adds an `is_verified` column to track email verification status.
  - Google OAuth users are automatically marked as verified (Google emails are pre-verified)
  - Email/password users start as unverified and get verified when they confirm their email
  - This allows us to show verification banners only for email/password signups

  ## Changes
  1. Add `is_verified` boolean column to `user_profiles`
  2. Update `handle_new_user` trigger to set `is_verified` based on signup method
  3. Create function to sync verification status when email is confirmed
  4. Backfill existing users based on their auth status
*/

-- Step 1: Add is_verified column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Step 2: Backfill existing users
-- Google OAuth users are considered verified (their emails are pre-verified by Google)
-- Email/password users are verified if their email_confirmed_at is set
UPDATE public.user_profiles up
SET is_verified = CASE
  -- If user has email_confirmed_at, they're verified
  WHEN EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = up.id 
    AND u.email_confirmed_at IS NOT NULL
  ) THEN true
  -- If user signed up via Google OAuth (has provider metadata), mark as verified
  WHEN EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = up.id 
    AND u.raw_app_meta_data->>'provider' = 'google'
  ) THEN true
  ELSE false
END;

-- Step 3: Create function to sync verification status
CREATE OR REPLACE FUNCTION public.sync_email_verification_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update user_profiles.is_verified when email_confirmed_at changes
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.user_profiles
    SET is_verified = true, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to sync verification status
DROP TRIGGER IF EXISTS sync_verification_status ON auth.users;
CREATE TRIGGER sync_verification_status
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verification_status();

-- Step 5: Update handle_new_user to set is_verified based on signup method
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
  -- Email/password users start as unverified until they confirm their email
  v_is_verified := CASE
    WHEN v_is_google_oauth THEN true
    WHEN NEW.email_confirmed_at IS NOT NULL THEN true
    ELSE false
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
  ON CONFLICT (user_id) DO NOTHING;

  -- Create initial transaction record for new signups
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  )
  VALUES (
    NEW.id,
    free_credits,
    'subscription_renewal',
    'Welcome bonus: Free plan credits',
    free_credits,
    jsonb_build_object('plan', 'free', 'initial_grant', true)
  )
  ON CONFLICT DO NOTHING;

  -- Generate referral code for new user
  PERFORM public.generate_referral_code(NEW.id);

  -- Check if user signed up with a referral code
  v_referral_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  IF v_referral_code_used IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 6: Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

