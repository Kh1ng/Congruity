import React, { useEffect, useMemo, useState } from "react";
import { Hash, Volume2, Video } from "lucide-react";
import { useChannels } from "../hooks";
import Spinner from "./Spinner";
import Avatar from "./Avatar";

function ChannelList({
  serverId,
  serverName,
  directChannels,
  signalingUrl,
  selectedChannelId,
  memberMap,
  roomUsers,
  localSocketId,
  isVoiceConnected,
  activeVoiceChannelId,
  onSelectChannel,
}) {
  const { textChannels, voiceChannels, videoChannels, loading, error } =
    useChannels(serverId, { channelsOverride: directChannels });
  const [presenceByRoom, setPresenceByRoom] = useState({});

  const presenceUrl = useMemo(() => {
    const rawUrl = signalingUrl || import.meta.env.VITE_SIGNALING_URL || "ws://localhost:3001";
    if (rawUrl.startsWith("wss://")) return rawUrl.replace("wss://", "https://");
    if (rawUrl.startsWith("ws://")) return rawUrl.replace("ws://", "http://");
    return rawUrl;
  }, [signalingUrl]);

  useEffect(() => {
    if (!serverId) {
      setPresenceByRoom({});
      return undefined;
    }
    const voiceChannelIds = (voiceChannels || []).map((channel) => channel.id).filter(Boolean);
    if (voiceChannelIds.length === 0) {
      setPresenceByRoom({});
      return undefined;
    }

    let isMounted = true;

    const fetchPresence = async () => {
      try {
        const query = encodeURIComponent(voiceChannelIds.join(","));
        const response = await fetch(`${presenceUrl}/rooms?roomIds=${query}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!isMounted) return;
        const next = {};
        (data?.rooms || []).forEach((room) => {
          next[room.roomId] = room.users || [];
        });
        setPresenceByRoom(next);
      } catch {
        if (isMounted) {
          setPresenceByRoom({});
        }
      }
    };

    fetchPresence();
    const intervalId = setInterval(fetchPresence, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [presenceUrl, serverId, voiceChannels]);

  if (!serverId) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-theme px-3 py-3">
          <div className="truncate text-sm font-semibold text-theme">
            {serverName || "Server"}
          </div>
        </div>
        <div className="flex-1 px-3 py-3 text-sm text-theme-muted">
          Select a server to view channels.
        </div>
      </div>
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

  const showTextSection = textChannels.length > 0;
  const showVoiceSection = voiceChannels.length > 0;
  const showVideoSection = videoChannels.length > 0;

  const channelRowBase =
    "relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.92rem] transition";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 items-center border-b border-theme px-3">
        <div className="truncate text-sm font-semibold text-theme">
          {serverName || "Server"}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3">
        {showTextSection && (
          <div className="mb-3">
            <div className="mb-1.5 mt-2 px-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--gruv-fg3)]">
              Text
            </div>
            <ul className="space-y-1">
              {textChannels.map((ch) => {
                const isActive = selectedChannelId === ch.id;
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      className={`${channelRowBase} ${
                        isActive
                          ? "bg-[color:var(--gruv-bg2)] text-theme"
                          : "text-[color:var(--gruv-fg2)] hover:bg-[color:var(--gruv-bg1)] hover:text-theme"
                      }`}
                      onClick={() => onSelectChannel?.(ch)}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-theme-accent" />
                      )}
                      <Hash size={14} className="text-[color:var(--gruv-fg3)]" />
                      <span className="truncate">#{ch.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {showVoiceSection && (
          <div className="mb-3">
            <div className="mb-1.5 mt-3 px-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--gruv-fg3)]">
              Voice
            </div>
            <ul className="space-y-1">
              {voiceChannels.map((ch) => {
                const isActive = selectedChannelId === ch.id;
                const isActiveVoiceChannel = activeVoiceChannelId === ch.id;
                const liveUsers = isActiveVoiceChannel ? roomUsers : presenceByRoom[ch.id];
                const normalizedUsers = (liveUsers || [])
                  .map((entry) =>
                    typeof entry === "string"
                      ? { socketId: entry, userId: null }
                      : {
                          socketId: entry?.socketId || null,
                          userId: entry?.userId || null,
                        }
                  )
                  .filter(
                    (entry, index, arr) =>
                      arr.findIndex((item) => item.socketId === entry.socketId) === index
                  );

                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      className={`${channelRowBase} ${
                        isActive
                          ? "bg-[color:var(--gruv-bg2)] text-theme"
                          : "text-[color:var(--gruv-fg2)] hover:bg-[color:var(--gruv-bg1)] hover:text-theme"
                      }`}
                      onClick={() => onSelectChannel?.(ch)}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-theme-accent" />
                      )}
                      <Volume2 size={14} className="text-[color:var(--gruv-fg3)]" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                    {(isActiveVoiceChannel || normalizedUsers.length > 0) && (
                      <div className="ml-6 mt-1 space-y-1 text-xs text-theme-muted">
                        {isVoiceConnected && (
                          <div className="flex items-center gap-2">
                            <Avatar name="You" size="sm" />
                            <span>You</span>
                          </div>
                        )}
                        {normalizedUsers.map((entry) => {
                          const userId = entry?.userId || entry?.socketId;
                          if (entry.socketId && entry.socketId === localSocketId) {
                            return null;
                          }
                          const profile = memberMap?.[userId]?.profile || {};
                          const name =
                            profile.display_name ||
                            profile.username ||
                            userId ||
                            "Unknown";
                          const avatarSrc = profile.avatar_url || profile.avatar;
                          return (
                            <div key={entry.socketId || userId} className="flex items-center gap-2">
                              <Avatar name={name} src={avatarSrc} size="sm" />
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
        )}

        {showVideoSection && (
          <div>
            <div className="mb-1.5 mt-3 px-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--gruv-fg3)]">
              Video
            </div>
            <ul className="space-y-1">
              {videoChannels.map((ch) => {
                const isActive = selectedChannelId === ch.id;
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      className={`${channelRowBase} ${
                        isActive
                          ? "bg-[color:var(--gruv-bg2)] text-theme"
                          : "text-[color:var(--gruv-fg2)] hover:bg-[color:var(--gruv-bg1)] hover:text-theme"
                      }`}
                      onClick={() => onSelectChannel?.(ch)}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-theme-accent" />
                      )}
                      <Video size={14} className="text-[color:var(--gruv-fg3)]" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChannelList;
