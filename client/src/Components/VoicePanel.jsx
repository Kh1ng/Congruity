import React, { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "./Avatar";

function ParticipantMedia({ stream, isLocal, isDeafened }) {
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
      {hasAudio && <audio ref={audioRef} autoPlay muted={isLocal || isDeafened} />}
    </>
  );
}

function OutgoingPreview({ stream, label }) {
  const previewRef = useRef(null);

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.srcObject = stream || null;
  }, [stream]);

  if (!stream || !stream.getVideoTracks().length) return null;

  return (
    <div className="rounded-lg border border-theme bg-[color:var(--gruv-bg1)] p-2">
      <div className="mb-1 text-[11px] text-[color:var(--gruv-fg3)]">{label}</div>
      <video
        ref={previewRef}
        autoPlay
        playsInline
        muted
        className="h-24 w-40 rounded-md border border-theme bg-[color:var(--gruv-bg_hard)] object-contain"
      />
    </div>
  );
}

function VoicePanel({ channel, voice, memberMap }) {
  const { user } = useAuth();
  const [isLocalTileHovered, setIsLocalTileHovered] = useState(false);
  const [isPreviewPinned, setIsPreviewPinned] = useState(false);

  const {
    isConnected,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isDeafened,
    isVideoOff,
    isScreenSharing,
    audioLevels,
    roomUsers,
    localSocketId,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
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

  if (!channel) {
    return <div className="text-theme-muted">Select a voice channel to join.</div>;
  }

  const getLevel = (participant) => {
    const key = participant.isLocal ? "local" : participant.id;
    return Number(audioLevels?.[key] || 0);
  };

  const hasLiveVideo = (participant) =>
    participant.stream?.getVideoTracks().some((track) => track.readyState === "live");

  const showOutgoingPreview =
    (isLocalTileHovered || isPreviewPinned) &&
    localStream &&
    localStream.getVideoTracks().length > 0;

  const bottomButtonBase =
    "inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-theme px-3 text-xs text-theme-muted transition hover:bg-[color:var(--gruv-bg2)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="relative flex h-full min-h-0 flex-col pb-20">
      <div className="mb-3 flex items-center justify-between border-b border-theme pb-2">
        <div className="text-lg font-semibold text-theme">#{channel.name}</div>
        <button
          type="button"
          onClick={endCall}
          className="rounded-md border border-[color:var(--gruv-red)] bg-[color:var(--gruv-red)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[color:var(--gruv-bright-red)]"
        >
          Leave Call
        </button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-2">
          {participants.map((participant) => {
            const speakingLevel = getLevel(participant);
            const speaking = speakingLevel > 0.08;
            const showVideo = hasLiveVideo(participant) && !participant.isLocal;
            const cameraOff = !showVideo || (participant.isLocal && isVideoOff);

            return (
              <div
                key={participant.id}
                className="rounded-xl border border-theme bg-[color:var(--gruv-bg1)] p-3 text-center"
                onMouseEnter={() => {
                  if (participant.isLocal) setIsLocalTileHovered(true);
                }}
                onMouseLeave={() => {
                  if (participant.isLocal) setIsLocalTileHovered(false);
                }}
                onContextMenu={(event) => {
                  if (!participant.isLocal) return;
                  event.preventDefault();
                  setIsPreviewPinned((prev) => !prev);
                }}
                style={
                  speaking
                    ? {
                        borderColor: "var(--gruv-bright-green)",
                        boxShadow: "0 0 0 1px var(--gruv-bright-green), 0 0 14px rgba(184, 187, 38, 0.35)",
                      }
                    : undefined
                }
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-theme bg-[color:var(--gruv-bg_hard)]">
                  {showVideo ? (
                    <ParticipantMedia
                      stream={participant.stream}
                      isLocal={participant.isLocal}
                      isDeafened={isDeafened}
                    />
                  ) : (
                    <Avatar name={participant.name} src={participant.avatar} size="xl" />
                  )}
                </div>
                <div className="mt-2 truncate text-sm font-semibold text-theme">
                  {participant.isLocal ? "You" : participant.name}
                </div>
                {participant.isLocal && (
                  <div className="mt-1 text-[11px] text-[color:var(--gruv-fg3)]">
                    Hover for preview • right-click to pin
                  </div>
                )}
                {cameraOff && (
                  <div className="mt-0.5 text-xs text-[color:var(--gruv-fg3)]">Camera off</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-theme bg-[color:var(--gruv-bg_hard)] p-2">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
          {showOutgoingPreview && (
            <OutgoingPreview
              stream={localStream}
              label={isScreenSharing ? "Screen share preview" : "Camera preview"}
            />
          )}
          <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!isConnected}
            className={`${bottomButtonBase} ${isMuted ? "text-[color:var(--gruv-fg3)]" : "text-theme-accent"}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
          <button
            type="button"
            onClick={toggleDeafen}
            disabled={!isConnected}
            className={`${bottomButtonBase} ${isDeafened ? "text-theme-accent" : "text-[color:var(--gruv-fg3)]"}`}
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            <Headphones size={16} />
            <span className="hidden sm:inline">{isDeafened ? "Undeafen" : "Deafen"}</span>
          </button>
          <button
            type="button"
            onClick={toggleVideo}
            disabled={!isConnected}
            className={`${bottomButtonBase} ${isVideoOff ? "text-[color:var(--gruv-fg3)]" : "text-theme-accent"}`}
            title={isVideoOff ? "Enable camera" : "Disable camera"}
          >
            {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            <span className="hidden sm:inline">{isVideoOff ? "Camera On" : "Camera Off"}</span>
          </button>
          <button
            type="button"
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            disabled={!isConnected}
            className={`${bottomButtonBase} ${isScreenSharing ? "text-theme-accent" : "text-[color:var(--gruv-fg3)]"}`}
            title={isScreenSharing ? "Stop share" : "Share screen"}
          >
            <MonitorUp size={16} />
            <span className="hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
          </button>
          <button
            type="button"
            onClick={endCall}
            className="ml-1 inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-[color:var(--gruv-red)] bg-[color:var(--gruv-red)] px-3 text-sm font-semibold text-white transition hover:bg-[color:var(--gruv-bright-red)]"
            title="Leave call"
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">Leave</span>
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoicePanel;
