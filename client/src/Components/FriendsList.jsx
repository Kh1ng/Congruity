import React, { useState } from "react";
import { useFriends } from "@/hooks";

function FriendsList({ onMessage }) {
  const { friends, pending, loading, error, addFriendByUsername } = useFriends();
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
        <h2 className="text-xl font-bold mb-4">Friends</h2>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Friends</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Add friend by username"
          className="flex-1 bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        />
        <button type="submit" className="text-sm hover:text-gruvbox-orange">
          Add
        </button>
      </form>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {friends.length === 0 ? (
        <div className="text-slate-400">No friends yet</div>
      ) : (
        <ul className="space-y-2">
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
                className="text-xs hover:text-gruvbox-orange"
                onClick={() => onMessage?.(friend)}
              >
                Message
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm text-slate-400 mb-2">Pending</h3>
          <ul className="space-y-1 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="text-slate-300">
                {p.display_name || p.username}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FriendsList;
