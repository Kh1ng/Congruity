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
      <div className="text-theme-muted">Select a server to view channels.</div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-theme-muted">
        <Spinner size={14} /> Loading channels...
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-theme">Channels</h2>

      <div className="mb-2">
        <div className="mb-1 text-xs uppercase tracking-wide text-theme-muted">
          Text
        </div>
        <ul className="space-y-1">
          {textChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-theme-surface-alt hover:text-theme-accent ${
                    isActive
                      ? "bg-theme-surface-alt text-theme-accent"
                      : "text-theme"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  <Hash size={14} className="text-theme-muted" />
                  <span>{ch.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-xs uppercase tracking-wide text-theme-muted">
          Voice
        </div>
        <ul className="space-y-1">
          {voiceChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-theme-surface-alt hover:text-theme-accent ${
                    isActive
                      ? "bg-theme-surface-alt text-theme-accent"
                      : "text-theme"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  <Volume2 size={14} className="text-theme-muted" />
                  <span>{ch.name}</span>
                </button>
                {selectedChannel?.id === ch.id &&
                  activeVoiceChannelId === ch.id &&
                  (roomUsers?.length || 0) > 0 && (
                    <div className="ml-6 mt-1 space-y-1 text-xs text-theme-muted">
                      {(roomUsers || []).map((entry) => {
                        const userId = entry?.userId || entry;
                        const profile = memberMap?.[userId]?.profile || {};
                        const name =
                          profile.display_name ||
                          profile.username ||
                          userId ||
                          "Unknown";
                        return (
                          <div key={userId} className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-theme-accent" />
                            <span>{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      </div>

      {videoChannels.length > 0 && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-theme-muted">
            Video
          </div>
          <ul className="space-y-1">
            {videoChannels.map((ch) => {
              const isActive = selectedChannelId === ch.id;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-theme-surface-alt hover:text-theme-accent ${
                      isActive
                        ? "bg-theme-surface-alt text-theme-accent"
                        : "text-theme"
                    }`}
                    onClick={() => onSelectChannel?.(ch)}
                  >
                    <Video size={14} className="text-theme-muted" />
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
