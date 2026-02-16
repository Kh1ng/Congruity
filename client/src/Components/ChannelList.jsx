import React from "react";
import { useChannels } from "@/hooks";

function ChannelList({ serverId, selectedChannelId, onSelectChannel }) {
  const { textChannels, voiceChannels, videoChannels, loading, error } =
    useChannels(serverId);

  if (!serverId) {
    return <div className="text-slate-400">Select a server to view channels.</div>;
  }

  if (loading) return <div className="text-slate-400">Loading channels...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Channels</h2>

      <div className="mb-3">
        <div className="text-sm text-slate-400 mb-1">Text</div>
        <ul className="space-y-1">
          {textChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  className={`w-full text-left px-2 py-1 rounded hover:bg-slate-800 hover:text-gruvbox-orange ${
                    isActive ? "bg-slate-800 text-gruvbox-orange" : "text-slate-200"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  # {ch.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mb-3">
        <div className="text-sm text-slate-400 mb-1">Voice</div>
        <ul className="space-y-1">
          {voiceChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  className={`w-full text-left px-2 py-1 rounded hover:bg-slate-800 hover:text-gruvbox-orange ${
                    isActive ? "bg-slate-800 text-gruvbox-orange" : "text-slate-200"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  🔊 {ch.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-1">Video</div>
        <ul className="space-y-1">
          {videoChannels.map((ch) => {
            const isActive = selectedChannelId === ch.id;
            return (
              <li key={ch.id}>
                <button
                  className={`w-full text-left px-2 py-1 rounded hover:bg-slate-800 hover:text-gruvbox-orange ${
                    isActive ? "bg-slate-800 text-gruvbox-orange" : "text-slate-200"
                  }`}
                  onClick={() => onSelectChannel?.(ch)}
                >
                  🎥 {ch.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default ChannelList;
