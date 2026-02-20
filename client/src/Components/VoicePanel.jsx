import React, { useEffect, useMemo, useRef } from "react";
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
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

  const {
    isConnected,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    roomUsers,
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
        isLocal: false,
        stream: remoteStreamMap.get(socketId),
      });
    });

    return entries;
  }, [roomUsers, memberMap, user, remoteStreamMap, localStream]);

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
  const controlButtonClass =
    "inline-flex items-center gap-2 rounded-md border border-theme bg-theme-surface px-3 py-2 text-sm font-medium text-theme-muted transition hover:text-theme-accent disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 text-base font-semibold text-theme">#{channel.name}</div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

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
                <Avatar name={participant.name} size="md" />
                <div className="text-sm text-theme">
                  {participant.isLocal ? "You" : participant.name}
                </div>
              </div>
              <div className="mt-2 flex items-end gap-1">
                {[8, 14, 10, 16, 11].map((height, index) => (
                  <span
                    // Deterministic faux waveform for now; real levels can plug in later.
                    key={`${participant.id}-${height}`}
                    className={`inline-block w-1 rounded bg-theme-accent ${index % 2 === 0 ? "animate-pulse" : ""}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <button
            type="button"
            onClick={() => startCall({ video: false, audio: true })}
            className={controlButtonClass}
          >
            <Phone size={16} />
            Join Voice
          </button>
        ) : (
          <button
            type="button"
            onClick={endCall}
            className={controlButtonClass}
          >
            <PhoneOff size={16} />
            Leave Voice
          </button>
        )}
        <button
          type="button"
          onClick={toggleMute}
          className={controlButtonClass}
          disabled={!isConnected}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          className={controlButtonClass}
          disabled={!isConnected}
        >
          {isVideoOff ? <Video size={16} /> : <VideoOff size={16} />}
          {isVideoOff ? "Camera On" : "Camera Off"}
        </button>
        <button
          type="button"
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={controlButtonClass}
          disabled={!isConnected}
        >
          <MonitorUp size={16} />
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>
      </div>

      <div className="mt-4 text-sm text-theme-muted">
        {isConnected ? "Connected to voice channel." : "Not connected."}
      </div>
    </div>
  );
}

export default VoicePanel;
