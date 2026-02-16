import React, { useEffect, useRef } from "react";
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
      <div className="text-sm text-slate-400 mb-2">Video channel</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">You</div>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-40 bg-black rounded" />
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-40 bg-black rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <button
            onClick={() => startCall({ video: true, audio: true })}
            className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            Join Video
          </button>
        ) : (
          <button
            onClick={endCall}
            className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            Leave Video
          </button>
        )}
        <button
          onClick={toggleMute}
          className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={toggleVideo}
          className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isVideoOff ? "Video On" : "Video Off"}
        </button>
      </div>
    </div>
  );
}

export default VideoChannel;
