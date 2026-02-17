import React from "react";
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";

function VoiceDock({ channel, voice }) {
  if (!channel) return null;

  const {
    isConnected,
    isMuted,
    isVideoOff,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    roomUsers,
    localSocketId,
  } = voice;

  const visibleUsers = (roomUsers || []).filter(
    (user) => (user.socketId || user) !== localSocketId
  );

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl bg-slate-950/80 border border-slate-800 rounded p-2 z-40 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Voice</div>
          <div className="text-sm font-semibold">
            {isConnected ? "Connected" : "Not connected"} • #{channel.name}
          </div>
          <div className="text-xs text-slate-500">In room: {visibleUsers.length + 1}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleMute}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={toggleVideo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            {isVideoOff ? <Video size={14} /> : <VideoOff size={14} />}
            {isVideoOff ? "Camera On" : "Camera Off"}
          </button>
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            <MonitorUp size={14} />
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </button>
          <button
            onClick={endCall}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            <PhoneOff size={14} />
            Leave
          </button>
        </div>
      </div>
      {visibleUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
          {visibleUsers.map((user) => {
            const displayId = user.userId || user.socketId || user;
            return (
              <span
                key={user.socketId || displayId}
                className="px-2 py-1 bg-slate-900/60 rounded"
              >
                {displayId.slice(0, 6)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VoiceDock;
