import React, { useEffect, useState } from "react";
import { getFriendsList } from "../Services/friendService";

function FriendsList({ session }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (session) {
        const friendsList = await getFriendsList(session);
        setFriends(friendsList);
        setLoading(false);
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
        {friends.map((friendId) => (
          <li key={friendId}>{friendId}</li>
        ))}
      </ul>
    </div>
  );
}

export default FriendsList;
