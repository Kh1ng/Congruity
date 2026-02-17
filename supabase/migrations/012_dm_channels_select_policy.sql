-- Allow dm_channels select for members (RLS)
DROP POLICY IF EXISTS "Users can view dm channels" ON public.dm_channels;
CREATE POLICY "Users can view dm channels"
  ON public.dm_channels FOR SELECT
  TO authenticated
  USING (id IN (SELECT channel_id FROM public.dm_members WHERE user_id = auth.uid()));
