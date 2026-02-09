import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

function FriendsList() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch accepted friendships where user is either sender or receiver
        const { data, error } = await supabase
          .from("friendships")
          .select(`
            *,
            friend:profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url, status),
            user:profiles!friendships_user_id_fkey(id, username, display_name, avatar_url, status)
          `)
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq("status", "accepted");

        if (error) throw error;

        // Map to get the friend (the other person)
        const friendsList = (data || []).map((f) => {
          return f.user_id === user.id ? f.friend : f.user;
        });

        setFriends(friendsList);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Friends</h2>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Friends</h2>
      {friends.length === 0 ? (
        <div className="text-slate-400">No friends yet</div>
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => (
            <li key={friend.id} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  friend.status === "online"
                    ? "bg-green-500"
                    : "bg-slate-500"
                }`}
              />
              <span>{friend.display_name || friend.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FriendsList;
