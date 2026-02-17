import React from "react";
import { Hash, Volume2, Video } from "lucide-react";
import { useChannels } from "../hooks";
import Spinner from "./Spinner";

function ChannelList({
  serverId,
  selectedChannelId,
  selectedChannel,
  memberMap,
  roomUsers,
  activeVoiceChannelId,
  onSelectChannel,
}) {
  const { textChannels, voiceChannels, videoChannels, loading, error } =
    useChannels(serverId);

  if (!serverId) {
    return (
      <div className="text-slate-400">Select a server to view channels.</div>
    );
  }

  if (loading) {
    return (
      <div className="text-slate-400 flex items-center gap-2">
        <Spinner size={14} /> Loading channels...
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Channels</h2>

      <div className="mb-2">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Text
        </div>
        <ul className="space-y-1">
          {textChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-800 hover:text-gruvbox-orange ${
                    isActive
                      ? "bg-slate-800 text-gruvbox-orange"
                      : "text-slate-200"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  <Hash size={14} className="text-slate-500" />
                  <span>{ch.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mb-2">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Voice
        </div>
        <ul className="space-y-1">
          {voiceChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-800 hover:text-gruvbox-orange ${
                    isActive
                      ? "bg-slate-800 text-gruvbox-orange"
                      : "text-slate-200"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  <Volume2 size={14} className="text-slate-500" />
                  <span>{ch.name}</span>
                </button>
                {selectedChannel?.id === ch.id &&
                  activeVoiceChannelId === ch.id && (
                    <div className="mt-2 rounded border border-slate-800 bg-slate-950/40 p-2">
                      <div className="text-[0.65rem] uppercase tracking-wide text-slate-400 mb-1">
                        Voice Channel
                      </div>
                      <div className="text-xs text-slate-400">
                        {roomUsers?.length || 0} active
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-300">
                        {(roomUsers || []).map((entry) => {
                          const userId = entry?.userId || entry;
                          const profile = memberMap?.[userId]?.profile || {};
                          const name =
                            profile.display_name ||
                            profile.username ||
                            userId ||
                            "Unknown";
                          return (
                            <div
                              key={userId}
                              className="flex items-center gap-2"
                            >
                              <span className="h-2 w-2 rounded-full bg-slate-500" />
                              <span>{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      </div>

      {videoChannels.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            Video
          </div>
          <ul className="space-y-1">
            {videoChannels.map((ch) => {
              const isActive = selectedChannelId === ch.id;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-800 hover:text-gruvbox-orange ${
                      isActive
                        ? "bg-slate-800 text-gruvbox-orange"
                        : "text-slate-200"
                    }`}
                    onClick={() => onSelectChannel?.(ch)}
                  >
                    <Video size={14} className="text-slate-500" />
                    <span>{ch.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ChannelList;
