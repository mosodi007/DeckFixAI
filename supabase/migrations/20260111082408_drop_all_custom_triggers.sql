/*
  # Drop All Custom Triggers

  Since the triggers are causing OAuth failures, temporarily remove them completely.
  We'll add them back once we understand the root cause.
*/

-- Drop the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger on user_profiles
DROP TRIGGER IF EXISTS on_user_created_initialize_credits ON public.user_profiles;

-- Drop the functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_credits() CASCADE;
