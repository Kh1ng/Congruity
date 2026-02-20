import React, { useEffect, useMemo, useRef } from "react";
import {
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "./Avatar";

function StreamPreview({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream && stream.getVideoTracks().length) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  if (!stream || !stream.getVideoTracks().length) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="h-20 w-32 rounded object-contain bg-black"
    />
  );
}

function VoiceDock({ channel, voice, memberMap, embedded = false }) {
  const { user } = useAuth();

  const {
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    roomUsers,
    remoteStreams,
    localStream,
    stageStreamIds,
    setStageStreamIds,
  } = voice || {};

  const remoteStreamMap = useMemo(() => new Map(remoteStreams || []), [remoteStreams]);

  const participants = useMemo(() => {
    const entries = [];
    const localProfile = memberMap?.[user?.id]?.profile || {};
    const localName =
      localProfile.display_name || localProfile.username || user?.email || "You";
    entries.push({
      id: "local",
      name: localName,
      initials: localName.slice(0, 2).toUpperCase(),
      isLocal: true,
      stream: localStream,
    });

    (roomUsers || []).forEach((entry) => {
      const socketId = entry?.socketId || entry;
      const userId = entry?.userId;
      const profile = userId ? memberMap?.[userId]?.profile || {} : {};
      const name = profile.display_name || profile.username || userId || socketId;
      entries.push({
        id: socketId,
        name,
        initials: String(name || "?").slice(0, 2).toUpperCase(),
        stream: remoteStreamMap.get(socketId),
      });
    });

    return entries;
  }, [roomUsers, memberMap, user, remoteStreamMap, localStream]);

  if (!channel) return null;

  const toggleStage = (id) => {
    setStageStreamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const rootClasses = embedded
    ? "rounded-lg border border-theme bg-theme-surface-alt/70 p-3"
    : "fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 rounded-lg border border-theme bg-theme-surface-alt/80 p-3 shadow-lg";

  const controlButtonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-theme bg-theme-surface text-theme-muted transition hover:text-theme-accent disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={rootClasses}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-theme-muted">
            Voice
          </div>
          <div className="truncate text-sm font-semibold text-theme">
            {isConnected ? "Connected" : "Not connected"} • #{channel.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className={controlButtonClass}
            disabled={!isConnected}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            type="button"
            onClick={toggleVideo}
            className={controlButtonClass}
            disabled={!isConnected}
            title={isVideoOff ? "Camera On" : "Camera Off"}
          >
            {isVideoOff ? <Video size={14} /> : <VideoOff size={14} />}
          </button>
          <button
            type="button"
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={controlButtonClass}
            disabled={!isConnected}
            title={isScreenSharing ? "Stop Share" : "Share Screen"}
          >
            <MonitorUp size={14} />
          </button>
          <button
            type="button"
            onClick={endCall}
            className={controlButtonClass}
            disabled={!isConnected}
            title="Leave"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-md border border-theme bg-theme-surface px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            name={participants[0]?.name || "You"}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 text-xs">
            <div className="truncate font-semibold text-theme">
              {participants[0]?.name || "You"}
            </div>
            <div className="truncate text-theme-muted">
              {isConnected ? "In voice" : "Disconnected"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-theme-muted">
        {participants.map((participant) => (
          <div key={participant.id} className="relative group">
            <button
              type="button"
              className="h-8 w-8 rounded-full border border-theme bg-theme-surface text-[0.65rem] font-semibold text-theme-muted transition hover:border-theme-accent hover:text-theme-accent"
              title={participant.name}
              onClick={() => participant.stream && toggleStage(participant.id)}
            >
              {participant.initials}
            </button>
            {participant.stream && (
              <div className="absolute bottom-10 left-1/2 z-50 hidden -translate-x-1/2 rounded-md border border-theme bg-theme-surface p-2 text-[0.65rem] text-theme-muted group-hover:block">
                <div className="mb-1">{participant.name}</div>
                <StreamPreview stream={participant.stream} />
                <button
                  type="button"
                  className="mt-2 w-full rounded border border-theme bg-theme-surface-alt px-2 py-1 text-theme-muted transition hover:text-theme-accent"
                  onClick={() => toggleStage(participant.id)}
                >
                  {stageStreamIds.includes(participant.id) ? "Remove" : "Add"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VoiceDock;
