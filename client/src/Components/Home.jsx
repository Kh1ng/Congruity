import React, { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { useWebRTC, useServerMembers, useServerBackend } from "../hooks";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
import VoiceDock from "./VoiceDock";
import DockStack from "./DockStack";
import SettingsView from "./SettingsView";
import AppShell from "./AppShell";
import { registerPanel, listPanelsByDock } from "../modules";
import { isDirectServer } from "@/lib/directConnect";
import {
  DEFAULT_UI_PREFS,
  loadUiPrefs,
  normalizeUiPrefs,
  resolveResponsiveLayout,
  saveUiPrefs,
} from "@/lib/uiLayout";

function Home() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [collapseSocial, setCollapseSocial] = useState(true);
  const [uiPrefs, setUiPrefs] = useState(DEFAULT_UI_PREFS);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440,
  );

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
    const raw = localStorage.getItem("settingsDockCollapsed");
    if (raw == null) return;
    setCollapseSocial(raw === "true");
  }, []);

  useEffect(() => {
    setUiPrefs(loadUiPrefs());
  }, []);

  useEffect(() => {
    localStorage.setItem("settingsDockCollapsed", String(collapseSocial));
  }, [collapseSocial]);

  useEffect(() => {
    saveUiPrefs(uiPrefs);
  }, [uiPrefs]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const responsiveLayout = useMemo(
    () => resolveResponsiveLayout(viewportWidth),
    [viewportWidth],
  );

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
    return <Messages channelId={selectedChannel.id} memberMap={memberMap} />;
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
  const effectiveLeftDockWidth = Math.min(
    normalizedUiPrefs.widths.serverDock,
    responsiveLayout.serverDockMax,
  );
  const effectiveRightDockWidth = Math.min(
    normalizedUiPrefs.widths.memberPanel,
    responsiveLayout.memberDockMax || normalizedUiPrefs.widths.memberPanel,
  );
  const isRightDockCollapsed = collapseSocial || responsiveLayout.collapseMembers;
  const useMobileStack = responsiveLayout.mobileStack;

  const leftDockWidth = `minmax(220px, ${effectiveLeftDockWidth}px)`;
  const rightDockWidth = isRightDockCollapsed
    ? "0px"
    : `minmax(220px, ${effectiveRightDockWidth}px)`;

  const layoutPreset = useMemo(
    () => ({
      id: "home-default",
      root: useMobileStack
        ? {
            type: "split",
            direction: "vertical",
            gap: 8,
            sizes: ["minmax(220px, 36dvh)", "1fr"],
            children: [
              { type: "region", id: "mobileSidebar" },
              { type: "region", id: "workspace" },
            ],
          }
        : {
            type: "split",
            direction: "horizontal",
            gap: 10,
            sizes: [leftDockWidth, "1fr", rightDockWidth],
            children: [
              { type: "region", id: "leftDock" },
              { type: "region", id: "workspace" },
              { type: "region", id: "rightDock" },
            ],
          },
    }),
    [leftDockWidth, rightDockWidth, useMobileStack],
  );

  const leftPanels = useMemo(() => {
    registerPanel("servers", {
      dock: "left",
      title: "Servers",
      order: 1,
      content: (
        <ServerList
          onSelectServer={(server) => {
            setSelectedServer(server);
            setSelectedChannel(null);
          }}
        />
      ),
    });

    registerPanel("channels", {
      dock: "left",
      title: "Channels",
      order: 2,
      content: (
        <ChannelList
          serverId={selectedServerId}
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
          }}
        />
      ),
    });

    registerPanel("voice", {
      dock: "left",
      title: "Voice",
      order: 3,
      content: activeVoiceChannel ? (
        <VoiceDock
          embedded
          channel={activeVoiceChannel}
          voice={voiceSession}
          memberMap={memberMap}
        />
      ) : (
        <div className="text-xs text-theme-muted">Join a voice channel.</div>
      ),
    });

    return listPanelsByDock("left");
  }, [
    activeVoiceChannel,
    memberMap,
    selectedChannel?.id,
    selectedServerId,
    selectedServer?.directConfig?.channels,
    selectedServerSignalingUrl,
    voiceSession,
  ]);

  const rightPanels = useMemo(() => {
    registerPanel("settings", {
      dock: "right",
      title: "Settings",
      order: 3,
      content: (
        <SettingsView
          server={selectedServer}
          serverId={selectedServer?.id}
          voice={voiceSession}
          voiceChannel={activeVoiceChannel}
          uiPrefs={normalizedUiPrefs}
          onUiPrefsChange={setUiPrefs}
        />
      ),
    });

    return listPanelsByDock("right");
  }, [
    activeVoiceChannel,
    normalizedUiPrefs,
    selectedServer,
    voiceSession,
  ]);

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${
        normalizedUiPrefs.density === "compact" ? "text-[13px]" : ""
      }`}
      style={{
        ["--ui-panel-opacity"]: normalizedUiPrefs.panelOpacity,
        ["--ui-bg-opacity"]: normalizedUiPrefs.appBackgroundOpacity,
      }}
      data-breakpoint={responsiveLayout.breakpoint}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-theme">
            {selectedServer?.name || "Home"}
          </div>
          <div className="text-sm text-theme-muted">
            {selectedChannel ? `#${selectedChannel.name}` : "Select a channel"}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-theme-muted">
          <button
            type="button"
            onClick={() => setCollapseSocial((prev) => !prev)}
            className="inline-flex items-center gap-1.5 hover:text-theme-accent"
          >
            <Settings size={14} />
            {isRightDockCollapsed ? "Settings" : "Close settings"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AppShell
          layout={layoutPreset}
          regions={{
            leftDock: (
              <aside className={`ui-panel-surface rounded border border-theme p-2 min-h-0 h-full ${responsiveLayout.collapseChannels ? "hidden md:block" : ""}`}>
                <DockStack
                  dockId="left"
                  panels={leftPanels}
                  locked
                />
              </aside>
            ),
            mobileSidebar: (
              <section className="ui-panel-surface rounded border border-theme p-2 min-h-0 overflow-hidden">
                <DockStack dockId="left-mobile" panels={leftPanels} locked />
              </section>
            ),
            workspace: (
              <main className="ui-panel-surface rounded border border-theme p-2 sm:p-3 flex flex-col min-h-0">
                {renderChannelPanel}
              </main>
            ),
            rightDock: (
              <aside
                className={`min-h-0 h-full ${isRightDockCollapsed ? "hidden" : "ui-panel-surface rounded border border-theme p-2"}`}
              >
                {!isRightDockCollapsed && (
                  <DockStack
                    dockId="right"
                    panels={rightPanels}
                    locked
                  />
                )}
              </aside>
            ),
          }}
        />
      </div>
    </div>
  );
}

export default Home;
