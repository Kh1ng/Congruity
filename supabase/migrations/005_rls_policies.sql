-- Profiles: allow authenticated users to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Servers: allow members to view servers
DROP POLICY IF EXISTS "Server members can view servers" ON public.servers;
CREATE POLICY "Server members can view servers"
  ON public.servers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = servers.id
      AND sm.user_id = auth.uid()
    )
  );

-- Servers: allow creation only for self-hosted or cloud-entitled users
DROP POLICY IF EXISTS "Users can create servers" ON public.servers;
CREATE POLICY "Users can create servers"
  ON public.servers FOR INSERT
  TO authenticated
  WITH CHECK (
    (hosting_type = 'self_hosted') OR
    EXISTS (
      SELECT 1 FROM public.cloud_entitlements ce
      WHERE ce.user_id = auth.uid()
      AND ce.status = 'active'
    )
  );

-- Server members: allow members to view other members
DROP POLICY IF EXISTS "Members can view server members" ON public.server_members;
CREATE POLICY "Members can view server members"
  ON public.server_members FOR SELECT
  TO authenticated
  USING (
    server_id IN (
      SELECT server_id FROM public.server_members WHERE user_id = auth.uid()
    )
  );

-- Server members: allow users to insert themselves (join)
DROP POLICY IF EXISTS "Users can join servers" ON public.server_members;
CREATE POLICY "Users can join servers"
  ON public.server_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Cloud entitlements: users can view their own status
ALTER TABLE public.cloud_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own cloud entitlement" ON public.cloud_entitlements;
CREATE POLICY "Users can view own cloud entitlement"
  ON public.cloud_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
