import React, { useState, useEffect } from "react";
import { getMessages, postMessage } from "../Services/messages";

function Messages({ channelId, userId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      if (channelId) {
        const data = await getMessages(channelId);
        setMessages(data);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [channelId]);

  const handlePostMessage = async () => {
    if (newMessage.trim()) {
      await postMessage(channelId, newMessage, userId);
      setNewMessage("");
      const updatedMessages = await getMessages(channelId);
      setMessages(updatedMessages);
    }
  };

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div>
      <h1>Messages</h1>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <strong>{message.user_id}: </strong>
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
