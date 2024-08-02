import { supabase } from "../supabaseClient";

export const getFriendsList = async (userId) => {
  if (!userId) {
    console.error("No authenticated user found");
    return [];
  }

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", userId);

  if (error) {
    console.error("Error fetching friends list:", error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("No friends found for this user");
    return [];
  }

  const friendsList = data[0]?.friends?.arr || [];

  return friendsList;
};
