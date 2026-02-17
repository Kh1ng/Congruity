import React, { useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useWebRTC } from "@/hooks";

function VoiceChat({ channelId }) {
  const {
    isConnected,
    error,
    isMuted,
    startCall,
    endCall,
    toggleMute,
  } = useWebRTC(channelId);

  useEffect(() => {
    return () => {
      if (isConnected) endCall();
    };
  }, [isConnected, endCall]);

  if (!channelId) {
    return <div className="text-slate-400">Select a voice channel to join.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Voice channel</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
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
      </div>
      <div className="mt-4 text-slate-400 text-sm">
        {isConnected ? "Connected to voice channel." : "Not connected."}
      </div>
    </div>
  );
}

export default VoiceChat;
