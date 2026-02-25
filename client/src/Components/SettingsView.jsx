import React, { useMemo, useState } from "react";
import AccountSettings from "./AccountSettings";
import { useTheme } from "@/hooks/useTheme";

const TAB_OPTIONS = [
  { id: "application", label: "Application" },
  { id: "account", label: "Account" },
  { id: "server", label: "Server" },
];

function SettingsView({ server, serverId, voice, voiceChannel, uiPrefs, onUiPrefsChange }) {
  const [activeTab, setActiveTab] = useState("application");
  const {
    theme,
    setTheme,
    options: themeOptions,
    customPalette,
    setCustomColor,
    resetCustomPalette,
  } = useTheme();
  const video = voice?.videoConstraints || { width: 1280, height: 720, frameRate: 30 };
  const screen = voice?.screenConstraints || { width: 1920, height: 1080, frameRate: 30 };
  const panelOpacityPct = Math.round((uiPrefs?.panelOpacity || 0.92) * 100);
  const backgroundOpacityPct = Math.round((uiPrefs?.appBackgroundOpacity || 1) * 100);

  const updateVideo = (key) => (event) => {
    const value = Number(event.target.value);
    voice?.setVideoConstraints?.((prev) => ({ ...prev, [key]: value }));
  };

  const updateScreen = (key) => (event) => {
    const value = Number(event.target.value);
    voice?.setScreenConstraints?.((prev) => ({ ...prev, [key]: value }));
  };

  const patchUiPrefs = (patch) => {
    onUiPrefsChange?.((prev) => ({
      ...prev,
      ...patch,
      widths: {
        ...(prev?.widths || {}),
        ...(patch?.widths || {}),
      },
    }));
  };

  const themeFields = useMemo(
    () => [
      { key: "bg", label: "Background" },
      { key: "surface", label: "Surface" },
      { key: "surface-alt", label: "Surface alt" },
      { key: "text", label: "Text" },
      { key: "text-muted", label: "Muted" },
      { key: "border", label: "Border" },
      { key: "accent", label: "Accent" },
      { key: "accent-2", label: "Accent 2" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-3 gap-2 rounded border border-theme bg-theme-surface-alt/30 p-1"
        role="tablist"
        aria-label="Settings sections"
      >
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`rounded px-2 py-1.5 text-xs transition ${
              activeTab === tab.id
                ? "bg-theme-surface text-theme-accent border border-theme-accent"
                : "border border-transparent text-theme-muted hover:text-theme-accent"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "application" && (
        <>
          <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
            <h3 className="text-sm font-semibold text-theme">Theme & Appearance</h3>
            <p className="mt-1 text-xs text-theme-muted">
              Application-level appearance, density, and panel transparency.
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs text-theme-muted">
                <span>Theme preset</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="theme-control mt-1 w-full rounded px-2 py-2 text-sm"
                >
                  {themeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-theme-muted">
                <span>Panel opacity ({panelOpacityPct}%)</span>
                <input
                  aria-label="Panel opacity"
                  type="range"
                  min="55"
                  max="100"
                  step="1"
                  value={panelOpacityPct}
                  onChange={(e) => patchUiPrefs({ panelOpacity: Number(e.target.value) / 100 })}
                  className="mt-1 w-full"
                />
              </label>

              <label className="text-xs text-theme-muted">
                <span>Background opacity ({backgroundOpacityPct}%)</span>
                <input
                  aria-label="Background opacity"
                  type="range"
                  min="65"
                  max="100"
                  step="1"
                  value={backgroundOpacityPct}
                  onChange={(e) =>
                    patchUiPrefs({ appBackgroundOpacity: Number(e.target.value) / 100 })
                  }
                  className="mt-1 w-full"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-theme-muted">
                  <span>Left dock width ({uiPrefs?.widths?.serverDock ?? 280}px)</span>
                  <input
                    aria-label="Left dock width"
                    type="range"
                    min="220"
                    max="420"
                    step="10"
                    value={uiPrefs?.widths?.serverDock ?? 280}
                    onChange={(e) =>
                      patchUiPrefs({ widths: { serverDock: Number(e.target.value) } })
                    }
                    className="mt-1 w-full"
                  />
                </label>
                <label className="text-xs text-theme-muted">
                  <span>Member/settings width ({uiPrefs?.widths?.memberPanel ?? 300}px)</span>
                  <input
                    aria-label="Member panel width"
                    type="range"
                    min="220"
                    max="420"
                    step="10"
                    value={uiPrefs?.widths?.memberPanel ?? 300}
                    onChange={(e) =>
                      patchUiPrefs({ widths: { memberPanel: Number(e.target.value) } })
                    }
                    className="mt-1 w-full"
                  />
                </label>
              </div>

              <label className="text-xs text-theme-muted">
                <span>Density</span>
                <select
                  aria-label="Density"
                  value={uiPrefs?.density || "normal"}
                  onChange={(e) => patchUiPrefs({ density: e.target.value })}
                  className="theme-control mt-1 w-full rounded px-2 py-2 text-sm"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                </select>
              </label>

              {theme === "custom" && (
                <div className="rounded border border-theme bg-theme-surface/40 p-3">
                  <div className="mb-2 text-xs font-semibold text-theme-muted">
                    Custom theme tokens
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {themeFields.map((field) => (
                      <label key={field.key} className="text-xs text-theme-muted">
                        <span>{field.label}</span>
                        <input
                          type="color"
                          value={customPalette[field.key]}
                          onChange={(e) => setCustomColor(field.key, e.target.value)}
                          className="mt-1 h-8 w-full cursor-pointer rounded border border-theme bg-theme-surface"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={resetCustomPalette}
                    className="mt-2 text-xs text-theme-muted hover:text-theme-accent"
                  >
                    Reset custom palette
                  </button>
                </div>
              )}
            </div>
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
            <div className="mt-3 text-xs text-theme-muted">
              {voiceChannel ? `Active channel: #${voiceChannel.name}` : "Join a voice channel to see controls."}
            </div>
          </section>
        </>
      )}

      {activeTab === "account" && (
        <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
          <h3 className="text-sm font-semibold text-theme">Account Settings</h3>
          <p className="mt-1 text-xs text-theme-muted">
            Profile, nickname, and account appearance metadata.
          </p>
          <AccountSettings serverId={serverId} showAppearanceSection={false} />
        </section>
      )}

      {activeTab === "server" && (
        <section className="rounded border border-theme bg-theme-surface-alt/40 p-4">
          <h3 className="text-sm font-semibold text-theme">Server Settings</h3>
          {server ? (
            <div className="mt-2 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-theme-muted">
                  <span>Server name</span>
                  <input
                    value={server.name || ""}
                    readOnly
                    className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
                  />
                </label>
                <label className="text-xs text-theme-muted">
                  <span>Hosting type</span>
                  <input
                    value={server.isDirect ? "direct" : server.hosting_type || "self_hosted"}
                    readOnly
                    className="mt-1 w-full rounded border border-theme bg-theme-surface px-2 py-1 text-theme"
                  />
                </label>
              </div>
              <div className="rounded border border-theme bg-theme-surface/40 p-3">
                <div className="text-xs font-semibold text-theme-muted">Server Roles (alpha)</div>
                <p className="mt-1 text-xs text-theme-muted">
                  Role management UI is not fully implemented yet. Next step is owner/admin/member
                  roles with channel permissions and edit surfaces.
                </p>
              </div>
              <div className="rounded border border-theme bg-theme-surface/40 p-3">
                <div className="text-xs font-semibold text-theme-muted">Server-Specific Settings</div>
                <p className="mt-1 text-xs text-theme-muted">
                  This tab separates server controls from application/account settings. Editing server
                  metadata and invites will be expanded here next.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-theme-muted">
              Select a server to manage server-specific settings and roles.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default SettingsView;
