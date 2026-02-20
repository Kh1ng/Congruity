import React from "react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "./Avatar";

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
        <Avatar
          name={profile?.display_name || profile?.username || "Unknown"}
          src={profile?.avatar_url || profile?.avatar}
          size="lg"
          status={profile?.status}
        />
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
