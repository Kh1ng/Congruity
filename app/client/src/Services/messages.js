import { supabase } from "../supabaseClient";

export const getMessages = async (channelId) => {
  const { data, error } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, users(username)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }

  return data;
};

export const postMessage = async (channelId, content, user_id) => {
  console.log("user posting message:", user_id);
  const { data, error } = await supabase
    .from("messages")
    .insert([{ channel_id: channelId, content, user_id }]);

  if (error) {
    console.error("Error posting message:", error);
    throw error;
  }

  return data;
};
