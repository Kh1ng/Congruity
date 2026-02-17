-- Add hosting type + cloud entitlements
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS hosting_type TEXT DEFAULT 'self_hosted'
  CHECK (hosting_type IN ('self_hosted', 'cloud'));

CREATE TABLE IF NOT EXISTS public.cloud_entitlements (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_cloud_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cloud_entitlements_updated_at ON public.cloud_entitlements;
CREATE TRIGGER update_cloud_entitlements_updated_at
  BEFORE UPDATE ON public.cloud_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_cloud_entitlements_updated_at();
