-- DM channels policies
DROP POLICY IF EXISTS "Users can create dm channels" ON public.dm_channels;
CREATE POLICY "Users can create dm channels"
  ON public.dm_channels FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view dm channels" ON public.dm_channels;
CREATE POLICY "Users can view dm channels"
  ON public.dm_channels FOR SELECT
  TO authenticated
  USING (id IN (SELECT channel_id FROM public.dm_members WHERE user_id = auth.uid()));

-- DM members policies
DROP POLICY IF EXISTS "Users can manage dm members" ON public.dm_members;
CREATE POLICY "Users can manage dm members"
  ON public.dm_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view dm members" ON public.dm_members;
CREATE POLICY "Users can view dm members"
  ON public.dm_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- DM messages policies
DROP POLICY IF EXISTS "Users can view dm messages" ON public.dm_messages;
CREATE POLICY "Users can view dm messages"
  ON public.dm_messages FOR SELECT
  TO authenticated
  USING (channel_id IN (SELECT channel_id FROM public.dm_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can send dm messages" ON public.dm_messages;
CREATE POLICY "Users can send dm messages"
  ON public.dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
