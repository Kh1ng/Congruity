-- Fix dm_members SELECT policy to allow channel membership checks
DROP POLICY IF EXISTS "Users can view dm members" ON public.dm_members;
CREATE POLICY "Users can view dm members"
  ON public.dm_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_members dm
      WHERE dm.channel_id = dm_members.channel_id
      AND dm.user_id = auth.uid()
    )
  );
