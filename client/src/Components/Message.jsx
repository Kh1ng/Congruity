import React, { useState } from "react";
import { useMessages } from "@/hooks";

function Messages({ channelId }) {
  const { messages, loading, error, sendMessage } = useMessages(channelId);
  const [newMessage, setNewMessage] = useState("");

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert(err.message);
    }
  };

  if (loading) {
    return <div>Loading messages...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1>Messages</h1>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <strong>
              {message.profiles?.display_name ||
                message.profiles?.username ||
                message.user_id}
              :{" "}
            </strong>
            {message.content}
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={handlePostMessage}>Send</button>
    </div>
  );
}

export default Messages;
