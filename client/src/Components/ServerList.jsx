import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Cloud, LogIn, Plus, Server as ServerIcon } from "lucide-react";
import { useServers } from "@/hooks";
import Spinner from "./Spinner";
import Avatar from "./Avatar";
import {
  loadDirectServers,
  parseDirectConnectInput,
  saveDirectServers,
} from "@/lib/directConnect";

function ServerList({ onSelectServer, selectedServerId, variant = "panel" }) {
  const {
    servers,
    loading,
    error,
    createServer,
    joinServer,
  } = useServers();
  const [showCreate, setShowCreate] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [hostingType, setHostingType] = useState("self_hosted");
  const [createError, setCreateError] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [directServers, setDirectServers] = useState([]);
  const [showRailMenu, setShowRailMenu] = useState(false);

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

  const handleRemoveServer = async (server) => {
    if (!server) return;

    if (server.isDirect) {
      if (!window.confirm(`Remove local direct connection "${server.name}"?`)) return;
      setDirectServers((prev) => prev.filter((item) => item.id !== server.id));
      clearSelectionIfMatch(server.id);
    }
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
    if (variant === "rail") {
      return (
        <div className="flex h-full items-center justify-center text-theme-muted">
          <Spinner size={14} />
        </div>
      );
    }
    return (
      <div className="text-slate-400 flex items-center gap-2">
        <Spinner size={14} /> Loading servers...
      </div>
    );
  }

  if (error) {
    if (variant === "rail") {
      return <div className="p-2 text-[11px] text-red-400">Connection error</div>;
    }
    return <div className="text-red-500">{error}</div>;
  }

  if (variant === "rail") {
    return (
      <div className="relative flex h-full flex-col items-center py-2">
        <div className="flex-1 space-y-2 overflow-y-auto px-1">
          {combinedServers.map((server) => {
            const isActive = (selectedServerId || selectedId) === server.id;
            return (
              <button
                key={server.id}
                type="button"
                title={server.name}
                onClick={() => {
                  setSelectedId(server.id);
                  onSelectServer?.(server);
                }}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border border-theme transition ${
                  isActive
                    ? "bg-theme-surface text-theme-accent"
                    : "bg-theme-surface-alt text-theme-muted hover:text-theme"
                }`}
              >
                {isActive && (
                  <span className="absolute -left-2 h-6 w-1 rounded-r bg-theme-accent" />
                )}
                <Avatar
                  name={server.name}
                  src={server.icon_url || server.avatar_url || server.image_url}
                  size="lg"
                  className="h-11 w-11 rounded-xl border-0 bg-transparent"
                />
              </button>
            );
          })}
        </div>

        <div className="mt-2 px-1">
          <button
            type="button"
            onClick={() => setShowRailMenu((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-theme-surface-alt text-theme-muted transition hover:text-theme-accent"
            aria-label="Add or join server"
          >
            <Plus size={18} />
          </button>
        </div>

        {showRailMenu && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Close server menu"
              onClick={() => setShowRailMenu(false)}
            />
            <div className="relative w-full max-w-sm rounded-lg border border-theme bg-theme-surface p-4 shadow-2xl">
              <form
                onSubmit={async (event) => {
                  await handleJoin(event);
                  setShowRailMenu(false);
                }}
                className="mb-4 space-y-2"
              >
                <div className="text-[11px] uppercase tracking-[0.12em] text-theme-muted">
                  Join Server
                </div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite code or ws://host:3001"
                  className="w-full rounded border border-theme bg-theme-surface-alt px-2 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded border border-theme bg-theme-surface-alt px-2 py-2 text-sm text-theme-muted transition hover:text-theme-accent"
                >
                  Join
                </button>
              </form>
              <form
                onSubmit={async (event) => {
                  await handleCreate(event);
                  setShowRailMenu(false);
                }}
                className="space-y-2"
              >
                <div className="text-[11px] uppercase tracking-[0.12em] text-theme-muted">
                  Create Server
                </div>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Server name"
                  className="w-full rounded border border-theme bg-theme-surface-alt px-2 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded border border-theme bg-theme-surface-alt px-2 py-2 text-sm text-theme-muted transition hover:text-theme-accent"
                >
                  Create
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-base font-semibold">Servers</h1>
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
        <ul className="space-y-1">
          {combinedServers.map((server) => (
            <li
              key={server.id}
              className={`border rounded-md p-2 cursor-pointer transition hover:border-gruvbox-orange ${
                selectedId === server.id
                  ? "border-gruvbox-orange"
                  : "border-slate-600"
              }`}
              onClick={() => {
                setSelectedId(server.id);
                onSelectServer?.(server);
              }}
            >
              <div className="flex items-start gap-2">
                <Avatar
                  name={server.name}
                  src={server.icon_url || server.avatar_url || server.image_url}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">
                    {server.name}
                    {server.isDirect && (
                      <span className="ml-2 text-[10px] font-normal text-theme-muted">
                        Direct
                      </span>
                    )}
                  </h3>
                  {server.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                      {server.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                {server.isDirect ? (
                  <>
                    <span className="text-theme-muted">Local direct connection</span>
                    <button
                      type="button"
                      className="ml-auto rounded border border-theme px-2 py-0.5 text-theme-muted hover:text-theme-accent"
                      onClick={async (event) => {
                        event.stopPropagation();
                        try {
                          await handleRemoveServer(server);
                        } catch (err) {
                          alert(err.message || "Unable to remove direct server");
                        }
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="text-theme-muted">Manage in server settings</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ServerList;
