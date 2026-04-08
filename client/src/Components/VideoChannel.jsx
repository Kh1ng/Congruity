import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useWebRTC } from "@/hooks";

function VideoChannel({ channelId }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const {
    isConnected,
    localStream,
    remoteStreams,
    error,
    isMuted,
    isVideoOff,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC(channelId);

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

  if (!channelId) {
    return <div className="text-slate-400">Select a video channel to join.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Video channel</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex gap-4 mb-3">
        <div>
          <div className="text-xs text-slate-400 mb-1">You</div>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-40 bg-black rounded" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-40 bg-black rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <button
            onClick={() => startCall({ video: true, audio: true })}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <Phone size={16} />
            Join Video
          </button>
        ) : (
          <button
            onClick={endCall}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            <PhoneOff size={16} />
            Leave Video
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
          {isVideoOff ? "Video On" : "Video Off"}
        </button>
      </div>
    </div>
  );
}

export default VideoChannel;
