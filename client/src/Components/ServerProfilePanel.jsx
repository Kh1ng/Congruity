import React from "react";
import { useAuth } from "@/hooks/useAuth";

function ServerProfilePanel({ server, memberMap = {} }) {
  const { user } = useAuth();

  if (!server) {
    return (
      <div className="text-slate-400 text-sm">Select a server to view details.</div>
    );
  }

  const member = user ? memberMap[user.id] : null;
  const profile = member?.profile;

  return (
    <div className="mt-6 border-t border-slate-800 pt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Server Profile</h3>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs">
          {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">
            {profile?.display_name || profile?.username || "Unknown"}
          </div>
          <div className="text-xs text-slate-400">Role: {member?.role || "member"}</div>
        </div>
      </div>
      <div className="text-xs text-slate-400">Server: {server.name}</div>
      {member?.nickname && (
        <div className="text-xs text-slate-400 mt-1">Nickname: {member.nickname}</div>
      )}
    </div>
  );
}

export default ServerProfilePanel;
