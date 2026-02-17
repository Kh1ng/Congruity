import React, { useState } from "react";
import { useServers } from "@/hooks";
import Spinner from "./Spinner";

function ServerList({ onSelectServer }) {
  const { servers, loading, error, createServer, joinServer } = useServers();
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [hostingType, setHostingType] = useState("self_hosted");
  const [createError, setCreateError] = useState(null);
  const [createStep, setCreateStep] = useState(1);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!newServerName.trim()) return;
    try {
      await createServer(newServerName, null, hostingType);
      setNewServerName("");
      setShowCreate(false);
      setCreateStep(1);
      setHostingType("self_hosted");
    } catch (err) {
      setCreateError(err.message || "Unable to create server");
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
    return (
      <div className="text-slate-400 flex items-center gap-2">
        <Spinner size={14} /> Loading servers...
      </div>
    );
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
        <div className="mb-4 p-3 border border-slate-700 rounded space-y-3">
          {createStep === 1 && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase">Hosting</div>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded border ${
                  hostingType === "self_hosted"
                    ? "border-gruvbox-orange text-gruvbox-orange"
                    : "border-slate-700 text-slate-200"
                }`}
                onClick={() => {
                  setHostingType("self_hosted");
                  setCreateStep(2);
                }}
              >
                Self-hosted • Free
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded border ${
                  hostingType === "cloud"
                    ? "border-gruvbox-orange text-gruvbox-orange"
                    : "border-slate-700 text-slate-200"
                }`}
                onClick={() => {
                  setHostingType("cloud");
                  setCreateStep(2);
                }}
              >
                Cloud-hosted • Requires active plan
              </button>
            </div>
          )}

          {createStep === 2 && (
            <form onSubmit={handleCreate} className="space-y-2">
              <div className="text-xs text-slate-400 uppercase">Server details</div>
              <input
                type="text"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server name"
                className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100"
              />
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs text-slate-400" onClick={() => setCreateStep(1)}>
                  Back
                </button>
                <button type="submit" className="text-sm hover:text-gruvbox-orange">
                  Create ({hostingType === "cloud" ? "Cloud" : "Self-hosted"})
                </button>
              </div>
              {createError && <div className="text-xs text-red-400">{createError}</div>}
            </form>
          )}
        </div>
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
