import React, { useEffect, useRef } from "react";
import { Mic, MicOff, MonitorUp, Phone, PhoneOff, Video, VideoOff } from "lucide-react";

function VoicePanel({ channel, voice }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
  } = voice;

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    const firstRemote = remoteStreams?.[0]?.[1];
    if (remoteVideoRef.current && firstRemote) {
      remoteVideoRef.current.srcObject = firstRemote;
    }
  }, [remoteStreams]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Voice channel</div>
      <div className="text-base font-semibold mb-3">#{channel.name}</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="flex gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">You</div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-64 h-40 bg-black rounded"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Remote</div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-64 h-40 bg-black rounded"
          />
        </div>
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
