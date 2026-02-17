import React from "react";

function VoiceDock({ channel, voice }) {
  if (!channel) return null;

  const { isConnected, isMuted, toggleMute, endCall, roomUsers } = voice;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl bg-slate-950/80 border border-slate-800 rounded p-3 z-40 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Voice</div>
          <div className="text-sm font-semibold">
            {isConnected ? "Connected" : "Not connected"} • #{channel.name}
          </div>
          <div className="text-xs text-slate-500">In room: {roomUsers?.length || 0}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="px-3 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={endCall}
            className="px-3 py-1 text-xs font-medium hover:text-gruvbox-orange"
            disabled={!isConnected}
          >
            Leave
          </button>
        </div>
      </div>
      {roomUsers?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
          {roomUsers.map((id) => (
            <span key={id} className="px-2 py-1 bg-slate-900/60 rounded">
              {id.slice(0, 6)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default VoiceDock;
