/*
  # Create Referral System

  This migration creates the referral system infrastructure:
  - referral_codes table: Stores unique referral codes for each user
  - referrals table: Tracks referral relationships and status
  - Functions: Generate codes, validate, and process referral credits
  - RLS policies: Secure access to referral data
  - Triggers: Auto-generate codes for new users
*/

-- Step 1: Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Step 2: Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rejected', 'pending_review')),
  credits_awarded_referrer integer DEFAULT 0,
  credits_awarded_referred integer DEFAULT 0,
  ip_address text,
  device_fingerprint text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Step 3: Add referral tracking columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'referral_code_used'
  ) THEN
    ALTER TABLE public.user_profiles
    ADD COLUMN referral_code_used text,
    ADD COLUMN referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON public.user_profiles(referred_by);

-- Step 5: Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_counter integer := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id AND is_active = true;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate unique code (format: DECKFIX-XXXXXX)
  LOOP
    v_code := 'DECKFIX-' || upper(
      substring(md5(random()::text || p_user_id::text || now()::text) from 1 for 6)
    );
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      EXIT;
    END IF;
    
    v_counter := v_counter + 1;
    IF v_counter > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
  
  -- Insert or update referral code
  INSERT INTO public.referral_codes (user_id, code, is_active)
  VALUES (p_user_id, v_code, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    code = v_code,
    is_active = true,
    updated_at = now();
  
  RETURN v_code;
END;
$$;

-- Step 6: Function to validate referral code
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS TABLE (
  is_valid boolean,
  referrer_id uuid,
  code_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_code_id uuid;
BEGIN
  SELECT rc.user_id, rc.id INTO v_referrer_id, v_code_id
  FROM public.referral_codes rc
  WHERE rc.code = p_code 
    AND rc.is_active = true;
  
  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid;
  ELSE
    RETURN QUERY SELECT true, v_referrer_id, v_code_id;
  END IF;
END;
$$;

-- Step 7: Function to process referral credits (with abuse prevention)
CREATE OR REPLACE FUNCTION public.process_referral_credits(
  p_referred_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_device_fingerprint text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text,
  referrer_credits_awarded integer,
  referred_credits_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_record public.referrals%ROWTYPE;
  v_referrer_id uuid;
  v_referral_code text;
  v_referrer_email text;
  v_referred_email text;
  v_completed_count integer;
  v_lifetime_limit integer := 50; -- Configurable lifetime limit
  v_same_ip_count integer;
  v_same_device_count integer;
  v_credits_per_referral integer := 50;
  v_referrer_new_balance integer;
  v_referred_new_balance integer;
BEGIN
  -- Find pending referral for this user
  SELECT * INTO v_referral_record
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No pending referral found for this user', 0, 0;
    RETURN;
  END IF;
  
  v_referrer_id := v_referral_record.referrer_id;
  v_referral_code := v_referral_record.referral_code;
  
  -- Abuse Prevention Checks
  
  -- 1. Self-referral prevention (should already be caught, but double-check)
  IF v_referrer_id = p_referred_user_id THEN
    UPDATE public.referrals
    SET status = 'rejected',
        metadata = jsonb_build_object('reason', 'self_referral')
    WHERE id = v_referral_record.id;
    RETURN QUERY SELECT false, 'Self-referral detected', 0, 0;
    RETURN;
  END IF;
  
  -- 2. Check if referral already completed
  IF v_referral_record.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Referral already processed', 0, 0;
    RETURN;
  END IF;
  
  -- 3. Lifetime limit check
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id
    AND status = 'completed';
  
  IF v_completed_count >= v_lifetime_limit THEN
    UPDATE public.referrals
    SET status = 'rejected',
        metadata = jsonb_build_object('reason', 'lifetime_limit_reached', 'limit', v_lifetime_limit)
    WHERE id = v_referral_record.id;
    RETURN QUERY SELECT false, format('Lifetime referral limit reached (%s)', v_lifetime_limit), 0, 0;
    RETURN;
  END IF;
  
  -- 4. IP address tracking (flag for review if >3 from same IP)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_same_ip_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id
      AND ip_address = p_ip_address
      AND status IN ('completed', 'pending');
    
    IF v_same_ip_count > 3 THEN
      -- Flag for manual review instead of rejecting
      UPDATE public.referrals
      SET status = 'pending_review',
          metadata = jsonb_build_object(
            'reason', 'suspicious_ip_pattern',
            'ip_count', v_same_ip_count,
            'ip_address', p_ip_address
          )
      WHERE id = v_referral_record.id;
      RETURN QUERY SELECT false, 'Referral flagged for manual review due to IP pattern', 0, 0;
      RETURN;
    END IF;
  END IF;
  
  -- 5. Device fingerprint tracking
  IF p_device_fingerprint IS NOT NULL THEN
    SELECT COUNT(*) INTO v_same_device_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id
      AND device_fingerprint = p_device_fingerprint
      AND status IN ('completed', 'pending');
    
    IF v_same_device_count > 1 THEN
      UPDATE public.referrals
      SET status = 'pending_review',
          metadata = jsonb_build_object(
            'reason', 'suspicious_device_pattern',
            'device_count', v_same_device_count
          )
      WHERE id = v_referral_record.id;
      RETURN QUERY SELECT false, 'Referral flagged for manual review due to device pattern', 0, 0;
      RETURN;
    END IF;
  END IF;
  
  -- Get emails for transaction descriptions
  SELECT email INTO v_referrer_email
  FROM public.user_profiles
  WHERE id = v_referrer_id;
  
  SELECT email INTO v_referred_email
  FROM public.user_profiles
  WHERE id = p_referred_user_id;
  
  -- Award credits to referrer
  UPDATE public.user_credits
  SET 
    credits_balance = credits_balance + v_credits_per_referral,
    purchased_credits = purchased_credits + v_credits_per_referral,
    updated_at = now()
  WHERE user_id = v_referrer_id
  RETURNING credits_balance INTO v_referrer_new_balance;
  
  -- Log referrer transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  ) VALUES (
    v_referrer_id,
    v_credits_per_referral,
    'referral_bonus',
    format('Referral bonus: %s', COALESCE(v_referred_email, 'user')),
    v_referrer_new_balance,
    jsonb_build_object(
      'referral_id', v_referral_record.id,
      'referred_user_id', p_referred_user_id,
      'referral_code', v_referral_code
    )
  );
  
  -- Award credits to referred user
  UPDATE public.user_credits
  SET 
    credits_balance = credits_balance + v_credits_per_referral,
    purchased_credits = purchased_credits + v_credits_per_referral,
    updated_at = now()
  WHERE user_id = p_referred_user_id
  RETURNING credits_balance INTO v_referred_new_balance;
  
  -- Log referred user transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    balance_after,
    metadata
  ) VALUES (
    p_referred_user_id,
    v_credits_per_referral,
    'referral_bonus',
    format('Welcome bonus: Referred by %s', COALESCE(v_referrer_email, 'user')),
    v_referred_new_balance,
    jsonb_build_object(
      'referral_id', v_referral_record.id,
      'referrer_user_id', v_referrer_id,
      'referral_code', v_referral_code
    )
  );
  
  -- Update referral record
  UPDATE public.referrals
  SET 
    status = 'completed',
    credits_awarded_referrer = v_credits_per_referral,
    credits_awarded_referred = v_credits_per_referral,
    completed_at = now(),
    ip_address = COALESCE(p_ip_address, ip_address),
    device_fingerprint = COALESCE(p_device_fingerprint, device_fingerprint),
    user_agent = COALESCE(p_user_agent, user_agent)
  WHERE id = v_referral_record.id;
  
  RETURN QUERY SELECT 
    true, 
    'Credits awarded successfully', 
    v_credits_per_referral, 
    v_credits_per_referral;
END;
$$;

-- Step 8: RLS Policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral code
CREATE POLICY "Users can view own referral code"
  ON public.referral_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view referrals where they are the referrer
CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can view referrals where they are the referred user
CREATE POLICY "Users can view own referrals as referred"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referred_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access referral_codes"
  ON public.referral_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access referrals"
  ON public.referrals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 9: Update handle_new_user trigger to generate referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_plan_id uuid;
  free_credits integer := 100;
  v_referral_code text;
  v_referrer_id uuid;
  v_referral_code_used text;
  v_device_fingerprint text;
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at, raw_user_meta_data)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NOW(),
    NOW(),
    NEW.raw_user_meta_data
  )
  ON CONFLICT (id) DO NOTHING;

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
    -- Validate referral code and get referrer
    SELECT referrer_id INTO v_referrer_id
    FROM public.validate_referral_code(v_referral_code_used);
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      -- Update user profile with referral info
      UPDATE public.user_profiles
      SET 
        referral_code_used = v_referral_code_used,
        referred_by = v_referrer_id
      WHERE id = NEW.id;
      
      -- Generate device fingerprint from metadata if available
      v_device_fingerprint := md5(
        COALESCE(NEW.raw_user_meta_data->>'user_agent', '') ||
        COALESCE(NEW.raw_user_meta_data->>'screen_resolution', '') ||
        COALESCE(NEW.raw_user_meta_data->>'timezone', '')
      );
      
      -- Create referral record with 'pending' status
      INSERT INTO public.referrals (
        referrer_id,
        referred_id,
        referral_code,
        status,
        ip_address,
        device_fingerprint,
        user_agent,
        metadata
      ) VALUES (
        v_referrer_id,
        NEW.id,
        v_referral_code_used,
        'pending',
        NEW.raw_user_meta_data->>'ip_address',
        v_device_fingerprint,
        NEW.raw_user_meta_data->>'user_agent',
        jsonb_build_object(
          'signup_method', COALESCE(NEW.raw_user_meta_data->>'signup_method', 'unknown'),
          'created_at', NEW.created_at
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

