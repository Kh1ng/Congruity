import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook for managing friends + friend requests
 */
export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPending([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `*,
          friend:profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url, status),
          user:profiles!friendships_user_id_fkey(id, username, display_name, avatar_url, status)`
        )
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      const accepted = [];
      const pendingList = [];
      (data || []).forEach((f) => {
        const friend = f.user_id === user.id ? f.friend : f.user;
        if (f.status === "accepted") {
          accepted.push(friend);
        } else if (f.status === "pending") {
          pendingList.push(friend);
        }
      });

      setFriends(accepted);
      setPending(pendingList);
      setError(null);
    } catch (err) {
      console.error("Error fetching friends:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const addFriendByUsername = useCallback(
    async (username) => {
      if (!user) throw new Error("Must be logged in");
      if (!username.trim()) throw new Error("Username required");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", username)
        .single();

      if (profileError || !profile) throw new Error("User not found");
      if (profile.id === user.id) throw new Error("You can't add yourself");

      const { error: insertError } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: profile.id,
        status: "pending",
      });

      if (insertError) throw insertError;

      await fetchFriends();
      return profile;
    },
    [user, fetchFriends]
  );

  return {
    friends,
    pending,
    loading,
    error,
    addFriendByUsername,
    refetch: fetchFriends,
  };
}

export default useFriends;
