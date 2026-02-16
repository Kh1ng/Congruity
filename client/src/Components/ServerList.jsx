import React, { useState } from "react";
import { useServers } from "@/hooks";

function ServerList({ onSelectServer }) {
  const { servers, loading, error, createServer, joinServer } = useServers();
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    try {
      await createServer(newServerName);
      setNewServerName("");
      setShowCreate(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await joinServer(inviteCode);
      setInviteCode("");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div>Loading servers...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Servers</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-sm hover:text-gruvbox-orange"
        >
          + New
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 p-2 border rounded">
          <input
            type="text"
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            placeholder="Server name"
            className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 mb-2"
          />
          <button type="submit" className="text-sm hover:text-gruvbox-orange">
            Create Server
          </button>
        </form>
      )}

      <form onSubmit={handleJoin} className="mb-4 flex gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Invite code"
          className="flex-1 bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        />
        <button type="submit" className="text-sm hover:text-gruvbox-orange">
          Join
        </button>
      </form>

      {servers.length === 0 ? (
        <div className="text-slate-400">No servers yet. Create or join one!</div>
      ) : (
        <ul className="space-y-2">
          {servers.map((server) => (
            <li
              key={server.id}
              className={`border rounded p-3 cursor-pointer hover:border-gruvbox-orange ${
                selectedId === server.id
                  ? "border-gruvbox-orange"
                  : "border-slate-600"
              }`}
              onClick={() => {
                setSelectedId(server.id);
                onSelectServer?.(server);
              }}
            >
              <h3 className="font-semibold">{server.name}</h3>
              {server.description && (
                <p className="text-sm text-slate-400">{server.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ServerList;
