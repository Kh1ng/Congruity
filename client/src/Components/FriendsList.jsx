import React, { useState } from "react";
import { Check, MessageCircle, UserPlus, X } from "lucide-react";
import { useFriends } from "@/hooks";
import Spinner from "./Spinner";

function FriendsList({ onMessage }) {
  const { friends, pending, outgoing, loading, error, addFriendByUsername, respondToRequest } = useFriends();
  const [username, setUsername] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      await addFriendByUsername(username.trim());
      setUsername("");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Friends</h2>
        <div className="text-slate-400 flex items-center gap-2">
          <Spinner size={14} /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Friends</h2>

      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Add friend by username"
          className="flex-1 bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 text-sm hover:text-gruvbox-orange">
          <UserPlus size={16} />
          Add
        </button>
      </form>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {friends.length === 0 ? (
        <div className="text-slate-400">No friends yet</div>
      ) : (
        <ul className="space-y-1.5">
          {friends.map((friend) => (
            <li key={friend.id} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  friend.status === "online" ? "bg-green-500" : "bg-slate-500"
                }`}
              />
              <span className="flex-1">
                {friend.display_name || friend.username}
              </span>
              <button
                className="inline-flex items-center gap-1 text-xs hover:text-gruvbox-orange"
                onClick={() => onMessage?.(friend)}
              >
                <MessageCircle size={14} />
                Message
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm text-slate-400 mb-2">Requests</h3>
          <ul className="space-y-1.5 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-slate-300">
                  {p.display_name || p.username}
                </span>
                <button
                  className="inline-flex items-center gap-1 text-xs hover:text-gruvbox-orange"
                  onClick={() => respondToRequest(p.friendshipId, "accepted")}
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  onClick={() => respondToRequest(p.friendshipId, "blocked")}
                >
                  <X size={14} />
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm text-slate-400 mb-2">Pending Outgoing</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {outgoing.map((p) => (
              <li key={p.id}>{p.display_name || p.username}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FriendsList;
