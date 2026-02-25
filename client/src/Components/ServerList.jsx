import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Cloud, LogIn, Plus, Server as ServerIcon } from "lucide-react";
import { useServers } from "@/hooks";
import Spinner from "./Spinner";
import {
  loadDirectServers,
  parseDirectConnectInput,
  saveDirectServers,
} from "@/lib/directConnect";

function ServerList({ onSelectServer }) {
  const {
    servers,
    loading,
    error,
    createServer,
    joinServer,
    leaveServer,
    deleteServer,
  } = useServers();
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [hostingType, setHostingType] = useState("self_hosted");
  const [createError, setCreateError] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [directServers, setDirectServers] = useState([]);

  useEffect(() => {
    setDirectServers(loadDirectServers());
  }, []);

  useEffect(() => {
    saveDirectServers(directServers);
  }, [directServers]);

  const combinedServers = useMemo(() => {
    const localIds = new Set(directServers.map((server) => server.id));
    return [...directServers, ...servers.filter((server) => !localIds.has(server.id))];
  }, [directServers, servers]);

  const clearSelectionIfMatch = (serverId) => {
    if (selectedId === serverId) {
      setSelectedId(null);
      onSelectServer?.(null);
    }
  };

  const isOwnedServer = (server) =>
    Boolean(
      server?.server_members?.some((member) => member?.role === "owner") ||
        server?.is_owner === true,
    );

  const handleRemoveServer = async (server) => {
    if (!server) return;

    if (server.isDirect) {
      if (!window.confirm(`Remove local direct connection "${server.name}"?`)) return;
      setDirectServers((prev) => prev.filter((item) => item.id !== server.id));
      clearSelectionIfMatch(server.id);
      return;
    }

    const owned = isOwnedServer(server);
    const verb = owned ? "delete" : "leave";
    if (!window.confirm(`Are you sure you want to ${verb} "${server.name}"?`)) return;

    if (owned) {
      await deleteServer(server.id);
    } else {
      await leaveServer(server.id);
    }
    clearSelectionIfMatch(server.id);
  };

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
      const directServer = parseDirectConnectInput(inviteCode);
      if (directServer) {
        setDirectServers((prev) => {
          const next = [directServer, ...prev.filter((server) => server.id !== directServer.id)];
          return next;
        });
        setSelectedId(directServer.id);
        onSelectServer?.(directServer);
        setInviteCode("");
        return;
      }
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
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-semibold">Servers</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 text-sm hover:text-gruvbox-orange"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 p-2 border border-slate-700 rounded space-y-3">
          {createStep === 1 && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase">Hosting</div>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded border flex items-center gap-2 ${
                  hostingType === "self_hosted"
                    ? "border-gruvbox-orange text-gruvbox-orange"
                    : "border-slate-700 text-slate-200"
                }`}
                onClick={() => {
                  setHostingType("self_hosted");
                  setCreateStep(2);
                }}
              >
                <ServerIcon size={16} />
                Self-hosted • Free
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded border flex items-center gap-2 ${
                  hostingType === "cloud"
                    ? "border-gruvbox-orange text-gruvbox-orange"
                    : "border-slate-700 text-slate-200"
                }`}
                onClick={() => {
                  setHostingType("cloud");
                  setCreateStep(2);
                }}
              >
                <Cloud size={16} />
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
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-gruvbox-orange"
                  onClick={() => setCreateStep(1)}
                >
                  <ArrowLeft size={14} />
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

      <form onSubmit={handleJoin} className="mb-3 flex gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Invite code"
          className="flex-1 bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-1.5 text-sm hover:text-gruvbox-orange">
          <LogIn size={16} />
          Join
        </button>
      </form>
      <div className="mb-3 text-xs text-theme-muted">
        Invite code or direct URL/link (for self-host): <code>ws://host:3001</code>
      </div>

      {combinedServers.length === 0 ? (
        <div className="text-slate-400">No servers yet. Create or join one!</div>
      ) : (
        <ul className="space-y-1.5">
          {combinedServers.map((server) => (
            <li
              key={server.id}
              className={`border rounded p-2 cursor-pointer hover:border-gruvbox-orange ${
                selectedId === server.id
                  ? "border-gruvbox-orange"
                  : "border-slate-600"
              }`}
              onClick={() => {
                setSelectedId(server.id);
                onSelectServer?.(server);
              }}
            >
              <h3 className="font-semibold">
                {server.name}
                {server.isDirect && (
                  <span className="ml-2 text-xs font-normal text-theme-muted">
                    Direct
                  </span>
                )}
              </h3>
              {server.description && (
                <p className="text-sm text-slate-400">{server.description}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs">
                {server.isDirect ? (
                  <span className="text-theme-muted">Local direct connection</span>
                ) : (
                  <span className="text-theme-muted">
                    {isOwnedServer(server) ? "Owner" : "Member"}
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto rounded border border-theme px-2 py-0.5 text-theme-muted hover:text-theme-accent"
                  onClick={async (event) => {
                    event.stopPropagation();
                    try {
                      await handleRemoveServer(server);
                    } catch (err) {
                      alert(err.message || "Unable to update server membership");
                    }
                  }}
                >
                  {server.isDirect ? "Remove" : isOwnedServer(server) ? "Delete" : "Leave"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ServerList;
