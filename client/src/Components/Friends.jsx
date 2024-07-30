// src/Friends.jsx
import React, { useEffect, useState } from "react";
import { supabase, getCurrentUserId } from "../supabaseClient";

const fetchFriends = async (userId) => {
  const { data, error } = await supabase
    .from("friends")
    .select("friend_id, friend_name")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching friends:", error);
    return [];
  }

  return data;
};

function Friends({ onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      if (userId) {
        const friendsList = await fetchFriends(userId);
        setFriends(friendsList);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Friends List</h2>
      <ul>
        {friends.map((friend) => (
          <li key={friend.friend_id}>
            <button onClick={() => onSelectFriend(friend)}>
              {friend.friend_name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Friends;
