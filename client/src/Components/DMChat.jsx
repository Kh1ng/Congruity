import React, { useState } from "react";
import { useDirectMessages } from "@/hooks";

function DMChat({ friend }) {
  const { messages, loading, error, sendMessage } = useDirectMessages(friend?.id);
  const [newMessage, setNewMessage] = useState("");

  if (!friend) {
    return <div className="text-slate-400">Select a friend to start a DM.</div>;
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">DM: {friend.display_name || friend.username}</h2>
      </div>

      {loading && <div className="text-slate-400">Loading messages...</div>}
      {error && <div className="text-red-500">{error}</div>}

      <div className="border border-slate-700 rounded p-2 h-56 overflow-y-auto mb-2">
        {messages.length === 0 ? (
          <div className="text-slate-400">No messages yet</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id}>
                <strong>
                  {m.profiles?.display_name || m.profiles?.username || m.user_id}:
                </strong>{" "}
                {m.content}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a DM"
          className="flex-1 p-1 text-black rounded"
        />
        <button onClick={handleSend} className="text-sm hover:text-gruvbox-orange">
          Send
        </button>
      </div>
    </div>
  );
}

export default DMChat;
