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

function Home() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [collapseSocial, setCollapseSocial] = useState(true);

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
    localStorage.setItem("settingsDockCollapsed", String(collapseSocial));
  }, [collapseSocial]);

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

  const leftDockWidth = "minmax(250px, 22vw)";
  const rightDockWidth = collapseSocial ? "0px" : "minmax(260px, 24vw)";

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
        />
      ),
    });

    return listPanelsByDock("right");
  }, [
    activeVoiceChannel,
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
            onClick={() => setCollapseSocial((prev) => !prev)}
            className="inline-flex items-center gap-1.5 hover:text-theme-accent"
          >
            <Settings size={14} />
            {collapseSocial ? "Settings" : "Close settings"}
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
                  locked
                />
              </aside>
            ),
            workspace: (
              <main className="rounded border border-theme bg-theme-surface p-3 flex flex-col min-h-0">
                {renderChannelPanel}
              </main>
            ),
            rightDock: (
              <aside
                className={`min-h-0 h-full ${collapseSocial ? "hidden" : "rounded border border-theme bg-theme-surface p-2"}`}
              >
                {!collapseSocial && (
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
