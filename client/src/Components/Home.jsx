import React, { useEffect, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { useWebRTC, useServerMembers } from "@/hooks";
import FriendsList from "./FriendsList";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import DMChat from "./DMChat";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
import VoiceDock from "./VoiceDock";
import ServerProfilePanel from "./ServerProfilePanel";
import DockStack from "./DockStack";
import SettingsView from "./SettingsView";
import SubagentPanel from "./SubagentPanel";
import AppShell from "./AppShell";
import { registerPanel, listPanelsByDock } from "@/modules";

function Home() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [collapseServers, setCollapseServers] = useState(false);
  const [collapseChannels, setCollapseChannels] = useState(false);
  const [collapseSocial, setCollapseSocial] = useState(true);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

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
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "layoutPrefs",
      JSON.stringify({ collapseServers, collapseChannels, collapseSocial })
    );
  }, [collapseServers, collapseChannels, collapseSocial]);

  const renderChannelPanel = useMemo(() => {
    if (!selectedChannel) return <Messages channelId={null} />;
    if (selectedChannel.type === "voice" || selectedChannel.type === "video") {
      return <VoicePanel channel={selectedChannel} voice={voiceSession} />;
    }
    return (
      <Messages channelId={selectedChannel.id} memberMap={memberMap} />
    );
  }, [selectedChannel, voiceSession, memberMap]);

  const leftDockWidth =
    collapseServers && collapseChannels
      ? "80px"
      : collapseServers || collapseChannels
        ? "220px"
        : "320px";

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
    [leftDockWidth, rightDockWidth]
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
          onSelectChannel={(channel) => {
            setSelectedChannel(channel);
            if (channel.type === "voice" || channel.type === "video") {
              setActiveVoiceChannel(channel);
            }
          }}
        />
      ),
    });

    registerPanel("links", {
      dock: "left",
      title: "Links",
      order: 3,
      content: (
        <div className="text-xs text-slate-500">Voice & Video</div>
      ),
    });

    return listPanelsByDock("left");
  }, [collapseChannels, collapseServers, selectedServer?.id, selectedChannel?.id]);

  const rightPanels = useMemo(() => {
    registerPanel("friends", {
      dock: "right",
      title: "Friends",
      order: 1,
      content: <FriendsList onMessage={(friend) => setSelectedFriend(friend)} />,
    });

    registerPanel("dm", {
      dock: "right",
      title: "DM",
      order: 2,
      content: <DMChat friend={selectedFriend} />,
    });

    registerPanel("settings", {
      dock: "right",
      title: "Settings",
      order: 3,
      content: (
        <SettingsView
          server={selectedServer}
          serverId={selectedServer?.id}
        />
      ),
    });

    registerPanel("server-profile", {
      dock: "right",
      title: "Server",
      order: 4,
      content: (
        <ServerProfilePanel server={selectedServer} memberMap={memberMap} />
      ),
    });

    registerPanel("subagents", {
      dock: "right",
      title: "Subagents",
      order: 5,
      content: <SubagentPanel />,
    });

    return listPanelsByDock("right");
  }, [memberMap, selectedFriend, selectedServer]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-slate-100">
            {selectedServer?.name || "Home"}
          </div>
          <div className="text-sm text-slate-400">
            {selectedChannel ? `#${selectedChannel.name}` : "Select a channel"}
          </div>
        </div>
        <div className="relative text-xs text-slate-400">
          <button
            onClick={() => setShowLayoutMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 hover:text-gruvbox-orange"
          >
            <LayoutGrid size={14} />
            Layout
          </button>
          {showLayoutMenu && (
            <div className="absolute right-0 mt-2 w-40 rounded border border-slate-800 bg-slate-950/90 p-2 shadow-lg">
              <button
                onClick={() => setCollapseServers((v) => !v)}
                className="block w-full text-left text-xs text-slate-300 hover:text-gruvbox-orange"
              >
                {collapseServers ? "Show Servers" : "Hide Servers"}
              </button>
              <button
                onClick={() => setCollapseChannels((v) => !v)}
                className="mt-1 block w-full text-left text-xs text-slate-300 hover:text-gruvbox-orange"
              >
                {collapseChannels ? "Show Channels" : "Hide Channels"}
              </button>
              <button
                onClick={() => setCollapseSocial((v) => !v)}
                className="mt-1 block w-full text-left text-xs text-slate-300 hover:text-gruvbox-orange"
              >
                {collapseSocial ? "Show Social" : "Hide Social"}
              </button>
              <button
                onClick={resetLayout}
                className="mt-2 block w-full text-left text-xs text-slate-300 hover:text-gruvbox-orange"
              >
                Reset Layout
              </button>
            </div>
          )}
        </div>
      </div>

      <AppShell
        layout={layoutPreset}
        regions={{
          leftDock: (
            <aside className="bg-slate-950/40 border border-slate-800 rounded p-2 min-h-0 h-full">
              <DockStack dockId="left" panels={leftPanels} />
            </aside>
          ),
          workspace: (
            <main className="bg-slate-950/40 border border-slate-800 rounded p-3 flex flex-col">
              {renderChannelPanel}
            </main>
          ),
          rightDock: (
            <aside className="bg-slate-950/40 border border-slate-800 rounded p-2 min-h-0 h-full">
              {collapseSocial ? (
                <div className="text-xs text-slate-500">Social</div>
              ) : (
                <DockStack dockId="right" panels={rightPanels} />
              )}
            </aside>
          ),
        }}
      />

      <VoiceDock channel={activeVoiceChannel} voice={voiceSession} />
    </div>
  );
}

export default Home;
