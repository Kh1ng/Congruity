-- Helper to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_server_member(check_server_id UUID, check_user_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = check_server_id AND sm.user_id = check_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Members can view server members" ON public.server_members;
CREATE POLICY "Members can view server members"
  ON public.server_members FOR SELECT
  TO authenticated
  USING (is_server_member(server_id, auth.uid()));
