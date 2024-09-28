import React, { useEffect, useState } from "react";
import { getFriendsList } from "../Services/friends";
import VideoChat from "./VideoChat";

function FriendsList({ userId }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    const fetchFriends = async () => {
      const friendsList = await getFriendsList(userId);
      console.log("Friends list before setting state:", friendsList); // Log the friends list before setting state
      setFriends(friendsList);
      console.log("Friends state after setting:", friendsList); // Log the state after setting it
      setLoading(false);
    };

    fetchFriends();
  }, [userId]);

  const handleStartCall = (friendId) => {
    setSelectedFriend(friendId);
  };

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
        {Array.isArray(friends) &&
          friends.map((friendId) => (
            <li key={`friend-${friendId}`}>
              <button
                onClick={() => handleStartCall(friendId)}
                className="text-blue-500 underline"
              >
                {friendId}{" "}
                {/* Replace this with the friend's username or display name */}
              </button>
            </li>
          ))}
      </ul>

      {selectedFriend && (
        <VideoChat
          token="your-auth-token"
          userId={userId}
          peerId={selectedFriend}
          roomId="unique-room-id" // Use a dynamic room ID generation logic
        />
      )}
    </div>
  );
}

export default FriendsList;
