import React, { useMemo } from "react";
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

function VoicePanel({ channel, voice, memberMap }) {
  const { user } = useAuth();

  if (!channel) {
    return <div className="text-slate-400">Select a voice channel to join.</div>;
  }

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
    localSocketId,
    audioLevels,
    audioWaveforms,
  } = voice;

  void localStream;

  const remoteStreamMap = useMemo(() => new Map(remoteStreams || []), [remoteStreams]);

  const participants = useMemo(() => {
    const entries = [];
    const localProfile = memberMap?.[user?.id]?.profile || {};
    const localName =
      localProfile.display_name || localProfile.username || user?.email || "You";
    entries.push({
      id: "local",
      name: localName,
      avatar: localProfile.avatar_url || user?.user_metadata?.avatar_url,
      isLocal: true,
      isMuted,
    });

    (roomUsers || [])
      .filter((userEntry) => (userEntry.socketId || userEntry) !== localSocketId)
      .forEach((userEntry) => {
        const socketId = userEntry.socketId || userEntry;
        const userId = userEntry.userId;
        const profile = userId ? memberMap?.[userId]?.profile || {} : {};
        const name =
          profile.display_name || profile.username || userId || socketId.slice(0, 6);
        entries.push({
          id: socketId,
          name,
          avatar: profile.avatar_url,
          isLocal: false,
          stream: remoteStreamMap.get(socketId),
        });
      });

    return entries;
  }, [memberMap, user, roomUsers, localSocketId, isMuted, remoteStreamMap]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Voice channel</div>
      <div className="text-base font-semibold mb-3">#{channel.name}</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mb-4">
        {participants.map((participant) => {
          const initials = getInitials(participant.name);
          const meterKey = participant.isLocal ? "local" : participant.id;
          const level = audioLevels?.[meterKey] || 0;
          const waveform = audioWaveforms?.[meterKey] || [];
          const isSpeaking = level > 0.08;

          const points = waveform.length
            ? waveform
                .map((value, index) => {
                  const x = (index / (waveform.length - 1)) * 80;
                  const y = 20 - value * 14;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")
            : "0,20 80,20";
          return (
            <div
              key={participant.id}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
            >
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                  isSpeaking ? "border-gruvbox-orange" : "border-slate-700"
                } bg-slate-900 text-lg font-semibold text-slate-100`}
              >
                <div className="absolute -bottom-3 left-1/2 w-20 -translate-x-1/2">
                  <svg viewBox="0 0 80 40" className="h-6 w-full">
                    <polyline
                      fill="none"
                      stroke={isSpeaking ? "#d79921" : "#64748b"}
                      strokeWidth="2"
                      points={points}
                    />
                  </svg>
                </div>
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
                {participant.isLocal && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-950 p-1 text-xs">
                    {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-100 text-center">
                {participant.isLocal ? "You" : participant.name}
              </div>
              <div className="text-xs text-slate-400">
                {participant.isLocal
                  ? isMuted
                    ? "Muted"
                    : isConnected
                      ? "Speaking"
                      : "Offline"
                  : isSpeaking
                    ? "Speaking"
                    : "Idle"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <button
            onClick={() => startCall({ video: false, audio: true })}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <Phone size={16} />
            Join Voice
          </button>
        ) : (
          <button
            onClick={endCall}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <PhoneOff size={16} />
            Leave Voice
          </button>
        )}
        <button
          onClick={toggleMute}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleVideo}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isVideoOff ? <Video size={16} /> : <VideoOff size={16} />}
          {isVideoOff ? "Camera On" : "Camera Off"}
        </button>
        <button
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
