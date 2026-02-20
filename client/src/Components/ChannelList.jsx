import React, { useEffect, useMemo, useState } from "react";
import { Hash, Volume2, Video } from "lucide-react";
import { useChannels } from "../hooks";
import Spinner from "./Spinner";
import Avatar from "./Avatar";

function ChannelList({
  serverId,
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
    useChannels(serverId);
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

    let isMounted = true;

    const fetchPresence = async () => {
      try {
        const response = await fetch(`${presenceUrl}/rooms`);
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
  }, [presenceUrl, serverId]);

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
