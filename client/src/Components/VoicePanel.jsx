import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "./Avatar";

function ParticipantMedia({ stream, isLocal }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !audioRef.current) return;
    if (stream) {
      videoRef.current.srcObject = stream;
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  const hasVideo = stream.getVideoTracks().some((track) => track.readyState === "live");
  const hasAudio = stream.getAudioTracks().some((track) => track.readyState === "live");

  return (
    <>
      {hasVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-contain"
        />
      )}
      {hasAudio && <audio ref={audioRef} autoPlay muted={isLocal} />}
    </>
  );
}

function VoicePanel({ channel, voice, memberMap }) {
  const { user } = useAuth();
  const [showLocalPreview, setShowLocalPreview] = useState(false);

  const {
    isConnected,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isVideoOff,
    isScreenSharing,
    audioLevels,
    roomUsers,
    localSocketId,
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
      avatar: localProfile.avatar_url || localProfile.avatar,
    });

    (roomUsers || []).forEach((entry) => {
      const socketId = entry?.socketId || entry;
      const userId = entry?.userId;
      if (socketId === localSocketId || userId === user?.id) return;
      const profile = userId ? memberMap?.[userId]?.profile || {} : {};
      const name = profile.display_name || profile.username || userId || socketId;
      entries.push({
        id: socketId,
        name,
        initials: String(name || "?").slice(0, 2).toUpperCase(),
        isLocal: false,
        stream: remoteStreamMap.get(socketId),
        avatar: profile.avatar_url || profile.avatar,
      });
    });

    return entries;
  }, [roomUsers, memberMap, user, remoteStreamMap, localStream, localSocketId]);

  const videoParticipants = useMemo(
    () =>
      participants.filter((participant) =>
        !participant.isLocal &&
        participant.stream?.getVideoTracks().some((track) => track.readyState === "live")
      ),
    [participants]
  );

  if (!channel) {
    return <div className="text-theme-muted">Select a voice channel to join.</div>;
  }

  const showVideoStage = videoParticipants.length > 0;
  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold text-theme">#{channel.name}</div>
        <button
          type="button"
          onClick={() => setShowLocalPreview((prev) => !prev)}
          className="rounded border border-theme bg-theme-surface px-2 py-1 text-xs text-theme-muted transition hover:text-theme-accent"
        >
          {showLocalPreview ? "Hide preview" : "Show preview"}
        </button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {showLocalPreview && localStream && (
        <div className="mb-3 rounded-md border border-theme bg-theme-surface p-3">
          <div className="mb-2 text-xs text-theme-muted">Your preview</div>
          <div className="relative h-44 w-full overflow-hidden rounded-md border border-theme bg-theme-surface-alt">
            <ParticipantMedia stream={localStream} isLocal />
          </div>
        </div>
      )}

      {showVideoStage ? (
        <div className="grid gap-3 mb-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {videoParticipants.map((participant) => (
            <div
              key={participant.id}
              className="relative rounded-xl border border-theme bg-theme-surface-alt/40 p-3"
            >
              <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-theme bg-theme-surface">
                <ParticipantMedia stream={participant.stream} isLocal={participant.isLocal} />
              </div>
              <div className="mt-2 text-sm font-medium text-theme">{participant.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="rounded-md border border-theme bg-theme-surface px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <Avatar name={participant.name} src={participant.avatar} size="md" />
                <div className="text-sm text-theme">
                  {participant.isLocal ? "You" : participant.name}
                </div>
              </div>
              <div className="mt-2 flex items-end gap-1">
                {[0, 1, 2, 3, 4].map((index) => {
                  const levelKey = participant.isLocal ? "local" : participant.id;
                  const level = Number(audioLevels?.[levelKey] || 0);
                  const isIdle = level < 0.04;
                  const barHeight = isIdle
                    ? 4
                    : Math.max(6, Math.round((7 + index * 2) * (0.4 + level)));
                  return (
                  <span
                    key={`${participant.id}-${index}`}
                    className={`inline-block rounded-full bg-theme-accent transition-all ${index % 2 === 0 && !isIdle ? "animate-pulse" : ""}`}
                    style={{
                      width: isIdle ? "0.3rem" : "0.2rem",
                      height: `${barHeight}px`,
                    }}
                  />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-theme-muted">
        {isConnected
          ? `${isMuted ? "Muted" : "Live"} • ${isVideoOff ? "Camera off" : "Camera on"}${isScreenSharing ? " • Screen sharing" : ""}`
          : "Not connected."}
      </div>
    </div>
  );
}

export default VoicePanel;
