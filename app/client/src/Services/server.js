import { supabase } from "../supabaseClient";

// for home page
export const getServerList = async () => {
  const { data, error } = await supabase
    .from("servers")
    .select("id, name, thumbnail");
  if (error) {
    console.error("Error fetching servers:", error);
    return [];
  }

  return data;
};

// to build the server ui
export const getServerChannels = async () => {
  const { data, error } = await supabase.from("servers").select(`
        id,
        name,
        description,
        channels (
          id,
          name,
          description
        )
      `);
  if (error) {
    console.error("Error fetching servers and channels:", error);
    return [];
  }

  return data;
};

export const getServerName = async (serverId) => {
  const { data, error } = await supabase
    .from("servers")
    .select("name")
    .eq("id", serverId);

  if (error) {
    console.error("Error fetching server name:", error);
    return null;
  }

  const name = Array.isArray(data) && data.length > 0 ? data[0].name : null;
  return name;
};
