import React, { useState, useEffect } from "react";

function FriendsList({ session }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (session) {
        try {
          const response = await fetch(`/api/friends/${session.id}`, {
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            setFriends(data);
          } else {
            console.error("Failed to fetch friends list");
          }
        } catch (error) {
          console.error("Error fetching friends list:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFriends();
  }, [session]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl">Friends List</h2>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1>Friends List</h1>
      <ul>
        {friends.map((friend) => (
          <li key={friend.id}>{friend.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default FriendsList;
