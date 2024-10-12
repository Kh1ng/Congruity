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

  const handleStartCall = async (friendId) => {
    try {
      const response = await fetch("/functions/v1/signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "call",
          payload: {
            caller_id: userId,
            receiver_id: friendId,
            room_id: `room-${userId}-${friendId}`,
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Call signaling message sent:", data);
        setSelectedFriend(friendId);
      } else {
        console.error("Error sending call signaling message:", data.error);
      }
    } catch (error) {
      console.error("Error sending call signaling message:", error);
    }
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
                {friendId}
              </button>
            </li>
          ))}
      </ul>
      {selectedFriend && (
        <VideoChat
          userId={userId}
          peerId={selectedFriend}
          roomId={`room-${userId}-${selectedFriend}`}
          isInitiator={true}
        />
      )}
    </div>
  );
}

export default FriendsList;
