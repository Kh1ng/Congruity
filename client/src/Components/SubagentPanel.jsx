import React, { useCallback, useEffect, useMemo, useState } from "react";

const SUBAGENT_URL =
  import.meta.env.VITE_SUBAGENTS_URL || "/api/subagents";

const normalizeSessions = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.sessions && Array.isArray(payload.sessions)) return payload.sessions;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

const formatTimestamp = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

function SubagentPanel() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const activeCount = useMemo(() => sessions.length, [sessions.length]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(SUBAGENT_URL, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Unable to fetch (${response.status})`);
      }
      const payload = await response.json();
      const list = normalizeSessions(payload);
      setSessions(list);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err?.message || "Failed to load subagents");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="flex flex-col gap-3 text-xs text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">
            Active subagents
          </div>
          <div className="text-[11px] text-slate-400">
            {activeCount} running
            {lastUpdated ? ` • Updated ${formatTimestamp(lastUpdated)}` : ""}
          </div>
        </div>
        <button
          onClick={loadSessions}
          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-gruvbox-orange"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading sessions...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="text-slate-400">No active subagents.</div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id || session.sessionId || session.label}
              className="rounded border border-slate-800 bg-slate-950/40 p-2"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-100">
                  {session.label || session.name || session.id || "Subagent"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {session.status || session.state || "active"}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                <div>ID: {session.id || session.sessionId || "-"}</div>
                <div>
                  Started: {formatTimestamp(session.startedAt || session.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SubagentPanel;
