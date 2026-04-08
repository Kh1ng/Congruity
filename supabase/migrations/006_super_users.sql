-- Super users table
CREATE TABLE IF NOT EXISTS public.super_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.is_super_user(uid UUID)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_users WHERE user_id = uid);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Servers: allow super users full access
DROP POLICY IF EXISTS "Super users can manage servers" ON public.servers;
CREATE POLICY "Super users can manage servers"
  ON public.servers FOR ALL
  TO authenticated
  USING (is_super_user(auth.uid()))
  WITH CHECK (is_super_user(auth.uid()));

-- Channels: allow super users full access
DROP POLICY IF EXISTS "Super users can manage channels" ON public.channels;
CREATE POLICY "Super users can manage channels"
  ON public.channels FOR ALL
  TO authenticated
  USING (is_super_user(auth.uid()))
  WITH CHECK (is_super_user(auth.uid()));

-- Messages: allow super users full access on server messages
DROP POLICY IF EXISTS "Super users can manage messages" ON public.messages;
CREATE POLICY "Super users can manage messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (is_super_user(auth.uid()))
  WITH CHECK (is_super_user(auth.uid()));

-- Server members: allow super users full access
DROP POLICY IF EXISTS "Super users can manage server members" ON public.server_members;
CREATE POLICY "Super users can manage server members"
  ON public.server_members FOR ALL
  TO authenticated
  USING (is_super_user(auth.uid()))
  WITH CHECK (is_super_user(auth.uid()));

-- Friendships: allow super users full access (optional moderation tool)
DROP POLICY IF EXISTS "Super users can manage friendships" ON public.friendships;
CREATE POLICY "Super users can manage friendships"
  ON public.friendships FOR ALL
  TO authenticated
  USING (is_super_user(auth.uid()))
  WITH CHECK (is_super_user(auth.uid()));
