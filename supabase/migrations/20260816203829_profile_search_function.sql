/*
# Profile search function for adding contacts

1. Purpose
The profiles table has owner-only RLS, so users cannot query other users' profiles directly.
This SECURITY DEFINER function allows authenticated users to search for other users by display_name
(so they can add contacts). It returns only public info: id, display_name, avatar_url, status.

2. Security
- SECURITY DEFINER — runs with the function owner's privileges, bypassing RLS on profiles.
- Only returns id, display_name, avatar_url, status — no email or other sensitive data.
- Granted to authenticated role only.
*/

CREATE OR REPLACE FUNCTION public.search_profiles(p_query text)
RETURNS TABLE (id uuid, display_name text, avatar_url text, status text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, avatar_url, status
  FROM public.profiles
  WHERE display_name ILIKE '%' || p_query || '%'
    AND id <> auth.uid()
  ORDER BY display_name
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
