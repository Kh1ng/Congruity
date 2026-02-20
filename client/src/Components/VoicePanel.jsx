import React, { useEffect, useMemo, useRef } from "react";
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
        participant.stream?.getVideoTracks().some((track) => track.readyState === "live")
      ),
    [participants]
  );

  if (!channel) {
    return <div className="text-slate-400">Select a voice channel to join.</div>;
  }

  const showVideoStage = videoParticipants.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Voice channel</div>
          <div className="text-base font-semibold">#{channel.name}</div>
        </div>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {showVideoStage ? (
        <div className="grid gap-3 mb-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {videoParticipants.map((participant) => (
            <div
              key={participant.id}
              className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <ParticipantMedia stream={participant.stream} isLocal={participant.isLocal} />
              </div>
              <div className="mt-2 text-sm font-medium text-slate-100">
                {participant.isLocal ? "You" : participant.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 mb-4 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 rounded border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <div className="h-10 w-10 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-xs font-semibold">
                {participant.initials}
              </div>
              <div className="text-sm text-slate-100">{participant.name}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <button
            type="button"
            onClick={() => startCall({ video: false, audio: true })}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <Phone size={16} />
            Join Voice
          </button>
        ) : (
          <button
            type="button"
            onClick={endCall}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <PhoneOff size={16} />
            Leave Voice
          </button>
        )}
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isVideoOff ? <Video size={16} /> : <VideoOff size={16} />}
          {isVideoOff ? "Camera On" : "Camera Off"}
        </button>
        <button
          type="button"
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          <MonitorUp size={16} />
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>
      </div>

      <div className="mt-4 text-slate-400 text-sm">
        {isConnected ? "Connected to voice channel." : "Not connected."}
      </div>
    </div>
  );
}

export default VoicePanel;
