import React from "react";

function VoicePanel({ channel, voice }) {
  if (!channel) {
    return <div className="text-slate-400">Select a voice channel to join.</div>;
  }

  const { isConnected, error, isMuted, startCall, endCall, toggleMute } = voice;

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm text-slate-400 mb-2">Voice channel</div>
      <div className="text-lg font-semibold mb-4">#{channel.name}</div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <button
            onClick={() => startCall({ video: false, audio: true })}
            className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            Join Voice
          </button>
        ) : (
          <button
            onClick={endCall}
            className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          >
            Leave Voice
          </button>
        )}
        <button
          onClick={toggleMute}
          className="px-4 py-2 text-sm font-medium hover:text-gruvbox-orange"
          disabled={!isConnected}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
      </div>
      <div className="mt-4 text-slate-400 text-sm">
        {isConnected ? "Connected to voice channel." : "Not connected."}
      </div>
    </div>
  );
}

export default VoicePanel;
