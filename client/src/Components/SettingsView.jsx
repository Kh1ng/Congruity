import React, { useEffect, useMemo, useState } from "react";
import AccountSettings from "./AccountSettings";
import VoiceDock from "./VoiceDock";

const DEFAULT_LAYOUT = {
  collapseServers: false,
  collapseChannels: false,
  collapseSocial: true,
};

const PRESETS = {
  balanced: {
    label: "Balanced",
    values: DEFAULT_LAYOUT,
    description: "Show servers and channels, keep social collapsed.",
  },
  focus: {
    label: "Focus",
    values: {
      collapseServers: true,
      collapseChannels: true,
      collapseSocial: true,
    },
    description: "Hide all docks for maximum workspace space.",
  },
  social: {
    label: "Social",
    values: {
      collapseServers: false,
      collapseChannels: false,
      collapseSocial: false,
    },
    description: "Keep all docks visible for multitasking.",
  },
};

function SettingsView({ server, serverId, voice, voiceChannel, memberMap }) {
  const [layoutPrefs, setLayoutPrefs] = useState(DEFAULT_LAYOUT);

  useEffect(() => {
    const raw = localStorage.getItem("layoutPrefs");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setLayoutPrefs({
        ...DEFAULT_LAYOUT,
        ...parsed,
      });
    } catch {
      // ignore malformed settings
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("layoutPrefs", JSON.stringify(layoutPrefs));
  }, [layoutPrefs]);

  const presetKeys = useMemo(() => Object.keys(PRESETS), []);

  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setLayoutPrefs(preset.values);
    }
  };

  const updatePref = (key) => (event) => {
    const value = event.target.checked;
    setLayoutPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300">Profile & Theme</h3>
        <p className="mt-1 text-xs text-slate-500">
          Update your profile details and appearance presets.
        </p>
        <AccountSettings serverId={serverId} />
      </section>

      <section className="rounded border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300">Voice & Video</h3>
        <p className="mt-1 text-xs text-slate-500">
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
          <div className="mt-3 text-xs text-slate-400">Join a voice channel to see controls.</div>
        )}
      </section>

      <section className="rounded border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300">Server Settings</h3>
        <p className="mt-1 text-xs text-slate-500">
          Manage server configuration for the selected workspace.
        </p>
        <div className="mt-4 space-y-3 text-xs text-slate-300">
          <div>
            <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
              Server Name
            </div>
            <input
              type="text"
              value={server?.name || "No server selected"}
              disabled
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
            />
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
              Region
            </div>
            <input
              type="text"
              value={server?.region || "Auto (coming soon)"}
              disabled
              className="mt-1 w-full rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
            />
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
              Visibility
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded border border-slate-800 px-2 py-1">
                {server ? "Private" : "Select a server"}
              </span>
              <span>Server moderation controls will appear here.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300">Layout Presets</h3>
        <p className="mt-1 text-xs text-slate-500">
          Choose how docks are arranged in the workspace.
        </p>
        <div className="mt-4 grid gap-2">
          {presetKeys.map((key) => {
            const preset = PRESETS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className="flex w-full items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-300 hover:border-gruvbox-orange"
              >
                <div>
                  <div className="text-sm font-semibold">{preset.label}</div>
                  <div className="text-[0.65rem] text-slate-500">
                    {preset.description}
                  </div>
                </div>
                <span className="text-[0.6rem] uppercase tracking-wide text-slate-500">
                  Apply
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-300">
          <label className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span>Collapse server list</span>
            <input
              type="checkbox"
              checked={layoutPrefs.collapseServers}
              onChange={updatePref("collapseServers")}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span>Collapse channels</span>
            <input
              type="checkbox"
              checked={layoutPrefs.collapseChannels}
              onChange={updatePref("collapseChannels")}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span>Collapse social dock</span>
            <input
              type="checkbox"
              checked={layoutPrefs.collapseSocial}
              onChange={updatePref("collapseSocial")}
              className="h-4 w-4"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

export default SettingsView;
