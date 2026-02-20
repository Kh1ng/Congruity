import React, { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { useWebRTC, useServerMembers } from "../hooks";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
import VoiceDock from "./VoiceDock";
import DockStack from "./DockStack";
import SettingsView from "./SettingsView";
import AppShell from "./AppShell";
import { registerPanel, listPanelsByDock } from "../modules";

function Home() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [collapseServers, setCollapseServers] = useState(false);
  const [collapseChannels, setCollapseChannels] = useState(false);
  const [collapseSocial, setCollapseSocial] = useState(true);
  const [layoutLocked, setLayoutLocked] = useState(true);

  const voiceSession = useWebRTC(activeVoiceChannel?.id);
  const { memberMap } = useServerMembers(selectedServer?.id);

  useEffect(() => {
    const raw = localStorage.getItem("layoutPrefs");
    if (raw) {
      try {
        const prefs = JSON.parse(raw);
        setCollapseServers(!!prefs.collapseServers);
        setCollapseChannels(!!prefs.collapseChannels);
        setCollapseSocial(!!prefs.collapseSocial);
        setLayoutLocked(prefs.layoutLocked !== false);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "layoutPrefs",
      JSON.stringify({
        collapseServers,
        collapseChannels,
        collapseSocial,
        layoutLocked,
      }),
    );
  }, [collapseServers, collapseChannels, collapseSocial, layoutLocked]);

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

  let leftDockWidth = "320px";
  if (collapseServers && collapseChannels) {
    leftDockWidth = "80px";
  } else if (collapseServers || collapseChannels) {
    leftDockWidth = "220px";
  }

  const rightDockWidth = collapseSocial ? "80px" : "300px";

  const layoutPreset = useMemo(
    () => ({
      id: "home-default",
      root: {
        type: "split",
        direction: "horizontal",
        gap: 12,
        sizes: [leftDockWidth, "1fr", rightDockWidth],
        children: [
          { type: "region", id: "leftDock" },
          { type: "region", id: "workspace" },
          { type: "region", id: "rightDock" },
        ],
      },
    }),
    [leftDockWidth, rightDockWidth],
  );

  const leftPanels = useMemo(() => {
    registerPanel("servers", {
      dock: "left",
      title: "Servers",
      order: 1,
      content: collapseServers ? (
        <div className="text-xs text-theme-muted">Servers hidden</div>
      ) : (
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
      content: collapseChannels ? (
        <div className="text-xs text-theme-muted">Channels hidden</div>
      ) : (
        <ChannelList
          serverId={selectedServer?.id}
          selectedChannelId={selectedChannel?.id}
          selectedChannel={selectedChannel}
          memberMap={memberMap}
          roomUsers={voiceSession.roomUsers}
          activeVoiceChannelId={activeVoiceChannel?.id}
          onSelectChannel={(channel) => {
            setSelectedChannel(channel);
            if (channel.type === "voice" || channel.type === "video") {
              setActiveVoiceChannel(channel);
              if (!voiceSession.isConnected) {
                voiceSession.startCall({
                  video: channel.type === "video",
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
    collapseChannels,
    collapseServers,
    memberMap,
    selectedChannel,
    selectedServer?.id,
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
          memberMap={memberMap}
          layoutPrefs={{
            collapseServers,
            collapseChannels,
            collapseSocial,
            layoutLocked,
          }}
          onLayoutPrefsChange={(prefs) => {
            setCollapseServers(!!prefs.collapseServers);
            setCollapseChannels(!!prefs.collapseChannels);
            setCollapseSocial(!!prefs.collapseSocial);
            setLayoutLocked(prefs.layoutLocked !== false);
          }}
        />
      ),
    });

    return listPanelsByDock("right");
  }, [
    activeVoiceChannel,
    collapseChannels,
    collapseServers,
    collapseSocial,
    layoutLocked,
    memberMap,
    selectedServer,
    voiceSession,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
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
            onClick={() => setCollapseSocial(false)}
            className="inline-flex items-center gap-1.5 hover:text-theme-accent"
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AppShell
          layout={layoutPreset}
          regions={{
            leftDock: (
              <aside className="rounded border border-theme bg-theme-surface p-2 min-h-0 h-full">
                <DockStack
                  dockId="left"
                  panels={leftPanels}
                  locked={layoutLocked}
                />
              </aside>
            ),
            workspace: (
              <main className="rounded border border-theme bg-theme-surface p-3 flex flex-col min-h-0">
                {renderChannelPanel}
              </main>
            ),
            rightDock: (
              <aside className="rounded border border-theme bg-theme-surface p-2 min-h-0 h-full">
                {collapseSocial ? (
                  <div className="text-xs text-theme-muted">Settings</div>
                ) : (
                  <DockStack
                    dockId="right"
                    panels={rightPanels}
                    locked={layoutLocked}
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
