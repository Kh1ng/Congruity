import React, { useEffect, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { useWebRTC, useServerMembers } from "../hooks";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
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
        <div className="text-xs text-slate-500">Servers hidden</div>
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
        <div className="text-xs text-slate-500">Channels hidden</div>
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

    return listPanelsByDock("left");
  }, [
    collapseChannels,
    collapseServers,
    selectedServer?.id,
    selectedChannel?.id,
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
  }, [memberMap, selectedServer]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-slate-100">
            {selectedServer?.name || "Home"}
          </div>
          <div className="text-sm text-slate-400">
            {selectedChannel ? `#${selectedChannel.name}` : "Select a channel"}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setCollapseSocial(false)}
            className="inline-flex items-center gap-1.5 hover:text-gruvbox-orange"
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
              <aside className="bg-slate-950/40 border border-slate-800 rounded p-2 min-h-0 h-full">
                <DockStack
                  dockId="left"
                  panels={leftPanels}
                  locked={layoutLocked}
                />
              </aside>
            ),
            workspace: (
              <main className="bg-slate-950/40 border border-slate-800 rounded p-3 flex flex-col min-h-0">
                {renderChannelPanel}
              </main>
            ),
            rightDock: (
              <aside className="bg-slate-950/40 border border-slate-800 rounded p-2 min-h-0 h-full">
                {collapseSocial ? (
                  <div className="text-xs text-slate-500">Settings</div>
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
