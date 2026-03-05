import React from "react";
import { Headphones, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";
import Avatar from "@/Components/Avatar";

function VoiceChannelView({
  channelName,
  participants = [],
  isConnected = false,
  isMuted = false,
  isDeafened = false,
  isCameraOn = false,
  isScreenSharing = false,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
}) {
  const controlsBase =
    "inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-theme px-3 text-xs text-theme-muted transition hover:bg-[color:var(--gruv-bg2)]";

  return (
    <div className="relative flex h-full min-h-0 flex-col pb-20">
      <div className="mb-3 flex items-center justify-between border-b border-theme pb-2">
        <h2 className="truncate text-lg font-semibold text-theme">#{channelName}</h2>
        {isConnected ? (
          <button
            type="button"
            onClick={onLeave}
            className="rounded-md bg-[color:var(--gruv-red)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[color:var(--gruv-bright-red)]"
          >
            Leave Call
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            className="rounded-md border border-theme bg-theme-surface px-3 py-1.5 text-sm text-theme-muted transition hover:text-theme-accent"
          >
            Join Voice
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="rounded-lg border border-theme bg-theme-surface p-4 text-sm text-theme-muted">
            No active participants.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-2">
            {participants.map((participant) => {
              const speaking = Boolean(participant.isSpeaking);
              const cameraOff = !participant.hasVideo;
              return (
                <article
                  key={participant.identity || participant.id}
                  className="rounded-lg border border-theme bg-[color:var(--gruv-bg1)] p-3 text-center"
                  style={
                    speaking
                      ? {
                          borderColor: "var(--gruv-bright-green)",
                          boxShadow: "0 0 0 1px var(--gruv-bright-green)",
                        }
                      : undefined
                  }
                >
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-theme bg-[color:var(--gruv-bg_hard)]">
                    <Avatar
                      name={participant.name}
                      src={participant.avatar}
                      size="xl"
                    />
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-theme">
                    {participant.name}
                  </div>
                  {cameraOff && (
                    <div className="text-xs text-[color:var(--gruv-fg3)]">Camera off</div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-theme bg-[color:var(--gruv-bg_hard)] p-2">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`${controlsBase} ${isMuted ? "text-[color:var(--gruv-red)]" : "text-theme-accent"}`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
          <button
            type="button"
            onClick={onToggleDeafen}
            className={`${controlsBase} ${isDeafened ? "text-theme-accent" : "text-[color:var(--gruv-fg3)]"}`}
          >
            <Headphones size={16} />
            <span className="hidden sm:inline">{isDeafened ? "Undeafen" : "Deafen"}</span>
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className={`${controlsBase} ${isCameraOn ? "text-theme-accent" : "text-[color:var(--gruv-fg3)]"}`}
          >
            {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
            <span className="hidden sm:inline">Camera</span>
          </button>
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`${controlsBase} ${isScreenSharing ? "text-theme-accent" : "text-[color:var(--gruv-fg3)]"}`}
          >
            <MonitorUp size={16} />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="ml-1 inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-[color:var(--gruv-red)] px-3 text-sm font-semibold text-white transition hover:bg-[color:var(--gruv-bright-red)]"
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceChannelView;
