-- Secure invite lookup (avoids broad server SELECT)
CREATE OR REPLACE FUNCTION public.lookup_server_by_invite(code text)
RETURNS TABLE (id uuid, name text, invite_code text) AS $$
  SELECT s.id, s.name, s.invite_code
  FROM public.servers s
  WHERE s.invite_code = code
$$ LANGUAGE sql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.lookup_server_by_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_server_by_invite(text) TO authenticated;
