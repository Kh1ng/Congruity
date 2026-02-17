import React from "react";
import { useServerMembers } from "@/hooks";
import Spinner from "./Spinner";

const STATUS_COLORS = {
  online: "bg-emerald-400",
  idle: "bg-amber-400",
  dnd: "bg-rose-400",
  invisible: "bg-slate-500",
  offline: "bg-slate-500",
};

function MembersPanel({ serverId }) {
  const { members, loading, error } = useServerMembers(serverId);

  if (!serverId) {
    return <div className="text-xs text-slate-500">Select a server</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Spinner size={14} />
        Loading members…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-400">{error}</div>;
  }

  if (!members.length) {
    return <div className="text-xs text-slate-500">No members yet</div>;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const profile = member.profiles || {};
        const displayName = member.nickname || profile.display_name || profile.username;
        const status = profile.status || "offline";
        const statusClass = STATUS_COLORS[status] || STATUS_COLORS.offline;

        return (
          <div
            key={member.user_id}
            className="flex items-center gap-2 text-sm text-slate-200"
          >
            <span className={`h-2 w-2 rounded-full ${statusClass}`} />
            <span>{displayName || "Unknown"}</span>
          </div>
        );
      })}
    </div>
  );
}

export default MembersPanel;
