import React, { useEffect, useMemo, useState } from "react";
import { Menu, Settings, X } from "lucide-react";
import { useWebRTC, useServerMembers, useServerBackend } from "../hooks";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
import SettingsView from "./SettingsView";
import { isDirectServer } from "@/lib/directConnect";
import {
  DEFAULT_UI_PREFS,
  loadUiPrefs,
  normalizeUiPrefs,
  saveUiPrefs,
} from "@/lib/uiLayout";

function Home() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [uiPrefs, setUiPrefs] = useState(DEFAULT_UI_PREFS);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440,
  );
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const { backend: serverBackend } = useServerBackend(selectedServer?.id);
  const isDirectSelectedServer = isDirectServer(selectedServer);
  const selectedServerId = selectedServer?.id;
  const selectedServerSignalingUrl =
    selectedServer?.directConfig?.signaling_url || serverBackend?.signaling_url;
  const voiceSession = useWebRTC(activeVoiceChannel?.id, {
    signalingUrl: selectedServerSignalingUrl,
  });
  const { memberMap } = useServerMembers(isDirectSelectedServer ? null : selectedServerId);

  useEffect(() => {
    const raw = localStorage.getItem("settingsOverlayOpen");
    if (raw == null) return;
    setShowSettingsOverlay(raw === "true");
  }, []);

  useEffect(() => {
    setUiPrefs(loadUiPrefs());
  }, []);

  useEffect(() => {
    localStorage.setItem("settingsOverlayOpen", String(showSettingsOverlay));
  }, [showSettingsOverlay]);

  useEffect(() => {
    saveUiPrefs(uiPrefs);
  }, [uiPrefs]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const renderChannelPanel = useMemo(() => {
    if (!selectedChannel) return <Messages channelId={null} />;
    if (selectedChannel.type === "voice" || selectedChannel.type === "video") {
      return (
        <VoicePanel
          channel={selectedChannel}
          voice={voiceSession}
          memberMap={memberMap}
        />
      );
    }
    return (
      <Messages
        channelId={selectedChannel.id}
        channel={selectedChannel}
        memberMap={memberMap}
      />
    );
  }, [selectedChannel, voiceSession, memberMap]);

  const normalizedUiPrefs = useMemo(() => normalizeUiPrefs(uiPrefs), [uiPrefs]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-panel-opacity",
      String(normalizedUiPrefs.panelOpacity),
    );
    document.documentElement.style.setProperty(
      "--ui-bg-opacity",
      String(normalizedUiPrefs.appBackgroundOpacity),
    );
  }, [normalizedUiPrefs.appBackgroundOpacity, normalizedUiPrefs.panelOpacity]);
  const isMobileLayout = viewportWidth < 800;

  useEffect(() => {
    if (!isMobileLayout) {
      setShowMobileSidebar(false);
    }
  }, [isMobileLayout]);

  const inlineVoiceParticipants = useMemo(() => {
    const connectedUsers = voiceSession.roomUsers || [];
    const all = [];
    if (voiceSession.isConnected) {
      all.push({ id: "local", label: "You" });
    }
    connectedUsers.forEach((entry) => {
      const socketId = entry?.socketId || entry;
      const userId = entry?.userId;
      if (socketId && socketId === voiceSession.localSocketId) return;
      const profile = userId ? memberMap?.[userId]?.profile || {} : {};
      const label = profile.display_name || profile.username || "User";
      all.push({
        id: socketId || userId,
        label,
        avatar: profile.avatar_url || profile.avatar,
      });
    });
    return all;
  }, [
    memberMap,
    voiceSession.isConnected,
    voiceSession.localSocketId,
    voiceSession.roomUsers,
  ]);

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${
        normalizedUiPrefs.density === "compact" ? "text-[13px]" : ""
      }`}
      style={{
        ["--ui-panel-opacity"]: normalizedUiPrefs.panelOpacity,
        ["--ui-bg-opacity"]: normalizedUiPrefs.appBackgroundOpacity,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {isMobileLayout && (
            <button
              type="button"
              onClick={() => setShowMobileSidebar((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-theme bg-theme-surface-alt text-theme-muted hover:text-theme-accent"
              aria-label="Toggle sidebar"
            >
              <Menu size={14} />
            </button>
          )}
          <div className="text-lg font-semibold text-theme">
            {selectedServer?.name || "Home"}
          </div>
          <div className="truncate text-sm text-theme-muted">
            {selectedChannel ? `#${selectedChannel.name}` : "Select a channel"}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-theme-muted">
          <button
            type="button"
            onClick={() => setShowSettingsOverlay((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded border border-theme px-2 py-1 hover:text-theme-accent"
          >
            <Settings size={14} />
            {showSettingsOverlay ? "Close settings" : "Settings"}
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 gap-2">
        {(showMobileSidebar || !isMobileLayout) && (
          <div
            className={`${
              isMobileLayout
                ? "absolute inset-y-0 left-0 z-20 flex shadow-2xl"
                : "flex"
            } min-h-0`}
          >
            <aside className="congruity-server-rail min-h-0 w-[60px] flex-col overflow-y-auto rounded border border-theme">
              <ServerList
                variant="rail"
                selectedServerId={selectedServer?.id}
                onSelectServer={(server) => {
                  setSelectedServer(server);
                  setSelectedChannel(null);
                  if (isMobileLayout) setShowMobileSidebar(false);
                }}
              />
            </aside>
            <aside className="congruity-channel-sidebar flex min-h-0 w-[220px] flex-col overflow-hidden rounded border border-theme">
              <ChannelList
                serverId={selectedServerId}
                serverName={selectedServer?.name}
                directChannels={selectedServer?.directConfig?.channels}
                signalingUrl={selectedServerSignalingUrl}
                selectedChannelId={selectedChannel?.id}
                memberMap={memberMap}
                roomUsers={voiceSession.roomUsers}
                localSocketId={voiceSession.localSocketId}
                isVoiceConnected={voiceSession.isConnected}
                activeVoiceChannelId={activeVoiceChannel?.id}
                onSelectChannel={(channel) => {
                  setSelectedChannel(channel);
                  if (channel.type === "voice" || channel.type === "video") {
                    setActiveVoiceChannel(channel);
                    if (!voiceSession.isConnected && !voiceSession.isConnecting) {
                      voiceSession.startCall({
                        video: false,
                        audio: true,
                      });
                    }
                  }
                  if (isMobileLayout) setShowMobileSidebar(false);
                }}
              />
              <div className="h-14 border-t border-theme px-2 py-2">
                {inlineVoiceParticipants.length > 0 ? (
                  <div className="flex h-full items-center gap-1.5 overflow-x-auto pb-0.5">
                    {inlineVoiceParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="inline-flex items-center gap-1 rounded-md border border-theme bg-theme-surface-alt px-1.5 py-1 text-[11px] text-theme-muted"
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-theme-accent" />
                        <span className="truncate">{participant.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeVoiceChannel && !voiceSession.isConnected) {
                        voiceSession.startCall({
                          video: false,
                          audio: true,
                        });
                      }
                    }}
                    className="h-full w-full rounded-md border border-theme bg-theme-surface-alt px-3 py-2 text-left text-xs text-theme-muted transition hover:text-theme-accent"
                  >
                    Join a voice channel
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}

        {isMobileLayout && showMobileSidebar && (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/40"
            aria-label="Close sidebar"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        <main
          className={`ui-panel-surface flex min-h-0 flex-1 flex-col rounded border border-theme p-2 sm:p-3 ${
            isMobileLayout ? "ml-0" : "ml-[0px]"
          }`}
        >
          {renderChannelPanel}
        </main>
      </div>
      {showSettingsOverlay && (
        <div className="absolute inset-0 z-30 flex items-stretch justify-center bg-black/50 p-2 sm:p-4">
          <section className="ui-panel-surface flex h-full w-full max-w-6xl flex-col rounded-lg border border-theme">
            <div className="flex items-center justify-between border-b border-theme px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-theme">Settings</div>
                <div className="text-xs text-theme-muted">
                  Application, account, and server settings
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsOverlay(false)}
                className="inline-flex items-center gap-1 rounded border border-theme px-2 py-1 text-xs text-theme-muted hover:text-theme-accent"
              >
                <X size={14} />
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
              <SettingsView
                server={selectedServer}
                serverId={selectedServer?.id}
                voice={voiceSession}
                voiceChannel={activeVoiceChannel}
                uiPrefs={normalizedUiPrefs}
                onUiPrefsChange={setUiPrefs}
                onServerRemoved={() => {
                  setSelectedServer(null);
                  setSelectedChannel(null);
                  setActiveVoiceChannel(null);
                  setShowSettingsOverlay(false);
                }}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Home;
