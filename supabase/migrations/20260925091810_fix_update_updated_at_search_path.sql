/*
# Fix search_path on update_updated_at function

1. Security fix
- Set search_path to empty string on the update_updated_at trigger function
- Prevents search_path injection attacks
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
