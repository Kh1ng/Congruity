-- Secure DM channel creation via RPC
CREATE OR REPLACE FUNCTION public.create_dm_channel(friend_id uuid)
RETURNS uuid AS $$
DECLARE
  ch_id uuid;
BEGIN
  INSERT INTO public.dm_channels DEFAULT VALUES RETURNING id INTO ch_id;
  INSERT INTO public.dm_members (channel_id, user_id)
  VALUES (ch_id, auth.uid()), (ch_id, friend_id);
  RETURN ch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.create_dm_channel(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_dm_channel(uuid) TO authenticated;
