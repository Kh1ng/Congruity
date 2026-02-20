import React from "react";
import AccountSettings from "./AccountSettings";
import VoiceDock from "./VoiceDock";

function SettingsView({ server, serverId, voice, voiceChannel, memberMap }) {
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
        <h3 className="text-sm font-semibold text-theme">Voice & Video</h3>
        <p className="mt-1 text-xs text-theme-muted">
          Quick controls for your active voice channel.
        </p>
        {voiceChannel ? (
          <div className="mt-3">
            <VoiceDock
              embedded
              channel={voiceChannel}
              voice={voice}
              memberMap={memberMap}
            />
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
