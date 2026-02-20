import React from "react";
import AccountSettings from "./AccountSettings";

function SettingsView({ server, serverId, voice, voiceChannel }) {
  const video = voice?.videoConstraints || { width: 1280, height: 720, frameRate: 30 };
  const screen = voice?.screenConstraints || { width: 1920, height: 1080, frameRate: 30 };

  const updateVideo = (key) => (event) => {
    const value = Number(event.target.value);
    voice?.setVideoConstraints?.((prev) => ({ ...prev, [key]: value }));
  };

  const updateScreen = (key) => (event) => {
    const value = Number(event.target.value);
    voice?.setScreenConstraints?.((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
        <h3 className="text-sm font-semibold text-theme">Profile & Theme</h3>
        <p className="mt-1 text-xs text-theme-muted">
          Update profile details, avatar fields, and appearance.
        </p>
        <AccountSettings serverId={serverId} />
      </section>

      <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
        <h3 className="text-sm font-semibold text-theme">Voice & Video Defaults</h3>
        <p className="mt-1 text-xs text-theme-muted">
          Configure startup quality and capture defaults.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-theme-muted">
            <span>Camera width</span>
            <input
              type="number"
              min="320"
              step="1"
              value={video.width}
              onChange={updateVideo("width")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
          <label className="text-xs text-theme-muted">
            <span>Camera height</span>
            <input
              type="number"
              min="240"
              step="1"
              value={video.height}
              onChange={updateVideo("height")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
          <label className="text-xs text-theme-muted">
            <span>Camera FPS</span>
            <input
              type="number"
              min="15"
              max="60"
              step="1"
              value={video.frameRate}
              onChange={updateVideo("frameRate")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
          <label className="text-xs text-theme-muted">
            <span>Screen-share FPS</span>
            <input
              type="number"
              min="10"
              max="60"
              step="1"
              value={screen.frameRate}
              onChange={updateScreen("frameRate")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
          <label className="text-xs text-theme-muted">
            <span>Screen width</span>
            <input
              type="number"
              min="640"
              step="1"
              value={screen.width}
              onChange={updateScreen("width")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
          <label className="text-xs text-theme-muted">
            <span>Screen height</span>
            <input
              type="number"
              min="360"
              step="1"
              value={screen.height}
              onChange={updateScreen("height")}
              className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
            />
          </label>
        </div>
        {voiceChannel ? (
          <div className="mt-3 text-xs text-theme-muted">
            Active channel: #{voiceChannel.name}
          </div>
        ) : (
          <div className="mt-3 text-xs text-theme-muted">
            Join a voice channel to see controls.
          </div>
        )}
      </section>

      <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
        <h3 className="text-sm font-semibold text-theme">Server</h3>
        <div className="mt-2 text-xs text-theme-muted">
          {server ? `Selected: ${server.name}` : "No server selected"}
        </div>
      </section>
    </div>
  );
}

export default SettingsView;
