import { supabase } from "../supabaseClient";

export const getChannels = async (serverId) => {
  const { data, error } = await supabase
    .from("channels")
    .select("id, name, description")
    .eq("server_id", serverId);
  if (error) throw error;
  return data;
};
