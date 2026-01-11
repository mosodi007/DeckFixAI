/*
  # Make User Profiles Email Nullable

  ## Problem
  During OAuth signup, if there's any issue retrieving the email,
  the NOT NULL constraint on email might cause the trigger to fail.

  ## Solution
  - Make email nullable with a default empty string
  - Add a COALESCE in the trigger to handle missing emails
  - This prevents signup failures due to email issues

  ## Security
  - Email validation happens at the auth.users level
  - Having nullable email in profiles is acceptable
*/

-- Make email nullable and add default
ALTER TABLE user_profiles 
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE user_profiles 
  ALTER COLUMN email SET DEFAULT '';

-- Update the trigger function to handle missing emails
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile for the new user with safe defaults
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
