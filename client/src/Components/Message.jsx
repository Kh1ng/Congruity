import React, { useState } from "react";
import { useMessages } from "@/hooks";
import Spinner from "./Spinner";

function Messages({ channelId, memberMap = {} }) {
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

  if (!channelId) {
    return <div className="text-slate-400">Select a channel to start chatting.</div>;
  }

  if (loading) {
    return (
      <div className="text-slate-400 flex items-center gap-2">
        <Spinner size={14} /> Loading messages...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm text-slate-400 mb-2">Channel chat</div>
      <div className="flex-1 overflow-y-auto border border-slate-700 rounded p-3 bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="text-slate-400">No messages yet</div>
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => {
              const member = memberMap[message.user_id];
              const nickname = member?.nickname;
              const profile = member?.profile || message.profiles;
              const label =
                nickname ||
                profile?.display_name ||
                profile?.username ||
                profile?.id ||
                message.user_id;

              return (
                <li key={message.id}>
                  <span className="text-slate-400 mr-2">{label}</span>
                  <span>{message.content}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handlePostMessage();
            }
          }}
          placeholder="Type a message"
          className="flex-1 bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100"
        />
        <button
          onClick={handlePostMessage}
          className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Messages;
