import React, { useEffect, useMemo, useRef } from "react";
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

function ParticipantMedia({ stream, isLocal, fit = "cover" }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const hasLiveVideo =
    stream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled) ||
    false;
  const hasLiveAudio =
    stream?.getAudioTracks().some((track) => track.readyState === "live" && track.enabled) ||
    false;

  useEffect(() => {
    if (videoRef.current) {
      if (stream && hasLiveVideo) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
    if (audioRef.current) {
      if (stream && hasLiveAudio) {
        audioRef.current.srcObject = stream;
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [stream, hasLiveVideo, hasLiveAudio]);

  return (
    <>
      {stream && hasLiveVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${
            fit === "contain" ? "rounded-lg" : "rounded-full"
          }`}
        />
      )}
      {stream && hasLiveAudio && <audio ref={audioRef} autoPlay muted={isLocal} />}
    </>
  );
}

function VoicePanel({ channel, voice, memberMap }) {
  const { user } = useAuth();
  const [autoVideo, setAutoVideo] = React.useState(() => {
    const raw = localStorage.getItem("voice:autoVideo");
    return raw ? raw === "true" : true;
  });
  const [hiddenStreams, setHiddenStreams] = React.useState(() => new Set());
  const [focusedStreamId, setFocusedStreamId] = React.useState(null);

  useEffect(() => {
    localStorage.setItem("voice:autoVideo", String(autoVideo));
  }, [autoVideo]);

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
    videoConstraints,
    screenConstraints,
    setVideoConstraints,
    setScreenConstraints,
    stageStreamIds,
    setStageStreamIds,
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
      stream: localStream,
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
  }, [memberMap, user, roomUsers, localSocketId, isMuted, remoteStreamMap, localStream]);

  const videoParticipants = participants.filter(
    (participant) =>
      participant.stream &&
      participant.stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled)
  );

  const visibleVideoParticipants = videoParticipants.filter(
    (participant) => !hiddenStreams.has(participant.id)
  );

  const hasActiveVideo = visibleVideoParticipants.length > 0;
  const showVideoStage = autoVideo && hasActiveVideo;

  useEffect(() => {
    if (!showVideoStage) return;
    const defaults = visibleVideoParticipants
      .filter((participant) => !participant.isLocal)
      .map((participant) => participant.id);
    setStageStreamIds((prev) => {
      if (prev.length) return prev;
      if (!defaults.length) return prev;
      return defaults;
    });
  }, [showVideoStage, visibleVideoParticipants, setStageStreamIds]);

  const stageParticipants = focusedStreamId
    ? visibleVideoParticipants.filter((participant) => participant.id === focusedStreamId)
    : visibleVideoParticipants.filter((participant) => stageStreamIds.includes(participant.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Voice channel</div>
          <div className="text-base font-semibold">#{channel.name}</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            onClick={() => setAutoVideo((prev) => !prev)}
            className="text-xs text-slate-400 hover:text-gruvbox-orange"
          >
            Auto video: {autoVideo ? "On" : "Off"}
          </button>
          {focusedStreamId && (
            <button
              onClick={() => setFocusedStreamId(null)}
              className="text-xs text-slate-400 hover:text-gruvbox-orange"
            >
              Exit Focus
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
        <label className="flex items-center gap-2">
          Cam
          <select
            value={`${videoConstraints.width}x${videoConstraints.height}`}
            onChange={(e) => {
              const [width, height] = e.target.value.split("x").map(Number);
              setVideoConstraints((prev) => ({ ...prev, width, height }));
            }}
            className="bg-slate-900/60 border border-slate-800 rounded px-2 py-1"
          >
            <option value="640x360">640x360</option>
            <option value="1280x720">1280x720</option>
            <option value="1920x1080">1920x1080</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Cam FPS
          <select
            value={videoConstraints.frameRate}
            onChange={(e) =>
              setVideoConstraints((prev) => ({ ...prev, frameRate: Number(e.target.value) }))
            }
            className="bg-slate-900/60 border border-slate-800 rounded px-2 py-1"
          >
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Share
          <select
            value={`${screenConstraints.width}x${screenConstraints.height}`}
            onChange={(e) => {
              const [width, height] = e.target.value.split("x").map(Number);
              setScreenConstraints((prev) => ({ ...prev, width, height }));
            }}
            className="bg-slate-900/60 border border-slate-800 rounded px-2 py-1"
          >
            <option value="1280x720">1280x720</option>
            <option value="1920x1080">1920x1080</option>
            <option value="2560x1440">2560x1440</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Share FPS
          <select
            value={screenConstraints.frameRate}
            onChange={(e) =>
              setScreenConstraints((prev) => ({ ...prev, frameRate: Number(e.target.value) }))
            }
            className="bg-slate-900/60 border border-slate-800 rounded px-2 py-1"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}

      {showVideoStage && (
        <div
          className={`grid gap-3 mb-4 ${
            focusedStreamId
              ? "grid-cols-1"
              : visibleVideoParticipants.length > 1
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1"
          }`}
        >
          {stageParticipants.map((participant) => {
            const meterKey = participant.isLocal ? "local" : participant.id;
            const level = audioLevels?.[meterKey] || 0;
            const waveform = audioWaveforms?.[meterKey] || [];
            const isSpeaking = level > 0.01;
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
                key={`video-${participant.id}`}
                className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-3"
              >
                <div
                  className={`relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border-2 ${
                    isSpeaking ? "border-gruvbox-orange" : "border-slate-700"
                  } bg-slate-900 text-lg font-semibold text-slate-100 cursor-pointer`}
                  onClick={() =>
                    setFocusedStreamId((prev) => (prev === participant.id ? null : participant.id))
                  }
                >
                  <ParticipantMedia stream={participant.stream} isLocal={participant.isLocal} fit="contain" />
                  <button
                    className="absolute top-2 right-2 text-xs rounded border border-slate-700 bg-slate-950/70 px-2 py-1 hover:text-gruvbox-orange"
                    onClick={(event) => {
                      event.stopPropagation();
                      setHiddenStreams((prev) => {
                        const next = new Set(prev);
                        next.add(participant.id);
                        return next;
                      });
                    }}
                  >
                    Hide
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-100">
                    {participant.isLocal ? "You" : participant.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isSpeaking ? "Speaking" : "Idle"}
                  </div>
                </div>
                <div className="mt-2">
                  <svg viewBox="0 0 80 40" className="h-6 w-full">
                    <polyline
                      fill="none"
                      stroke={isSpeaking ? "#d79921" : "#64748b"}
                      strokeWidth="2"
                      points={points}
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
