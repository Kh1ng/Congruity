import { supabase } from "../supabaseClient";

export const getFriendsList = async (userId) => {
  if (!userId) {
    console.error("No user ID provided");
    return [];
  }

  const { data, error } = await supabase
    .from("friendships")
    .select("sender, friend")
    .or(`sender.eq.${userId},friend.eq.${userId}`);

  if (error) {
    console.error("Error fetching friends list:", error);
    return [];
  }

  const friendsList = data.map((friendship) =>
    friendship.sender === userId ? friendship.friend : friendship.sender
  );

  console.log("Processed friends list:", friendsList); // Ensure this is an array

  return friendsList || []; // Return an array even if friendsList is null or undefined
};
