-- Server-specific backend routing for cloud/self-hosted instances.
-- Enables the client to resolve signaling/storage endpoints per server.

CREATE TABLE IF NOT EXISTS public.server_backends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
    backend_mode TEXT NOT NULL DEFAULT 'cloud'
      CHECK (backend_mode IN ('cloud', 'self_hosted')),
    signaling_url TEXT,
    storage_provider TEXT NOT NULL DEFAULT 'supabase'
      CHECK (storage_provider IN ('supabase', 'minio', 's3_compatible')),
    storage_public_base_url TEXT,
    storage_bucket TEXT,
    storage_region TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (server_id)
);

CREATE INDEX IF NOT EXISTS idx_server_backends_server_id ON public.server_backends(server_id);

CREATE TRIGGER update_server_backends_updated_at
    BEFORE UPDATE ON public.server_backends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.server_backends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "server_backends_select" ON public.server_backends;
CREATE POLICY "server_backends_select" ON public.server_backends
  FOR SELECT TO authenticated
  USING (
    server_id IN (
      SELECT sm.server_id
      FROM public.server_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "server_backends_insert" ON public.server_backends;
CREATE POLICY "server_backends_insert" ON public.server_backends
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = server_backends.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "server_backends_update" ON public.server_backends;
CREATE POLICY "server_backends_update" ON public.server_backends
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = server_backends.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = server_backends.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "server_backends_delete" ON public.server_backends;
CREATE POLICY "server_backends_delete" ON public.server_backends
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.server_members sm
      WHERE sm.server_id = server_backends.server_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );
