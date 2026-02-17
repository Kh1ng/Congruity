import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWebRTC, useServerMembers } from "@/hooks";
import FriendsList from "./FriendsList";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import DMChat from "./DMChat";
import Messages from "./Message";
import VoicePanel from "./VoicePanel";
import VoiceDock from "./VoiceDock";
import VideoPanel from "./VideoPanel";
import AccountSettings from "./AccountSettings";
import ServerProfilePanel from "./ServerProfilePanel";

function Home() {
  const { signOut } = useAuth();
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);
  const [activeVideoChannel, setActiveVideoChannel] = useState(null);
  const [collapseServers, setCollapseServers] = useState(false);
  const [collapseChannels, setCollapseChannels] = useState(false);
  const [collapseSocial, setCollapseSocial] = useState(true);

  const voiceSession = useWebRTC(activeVoiceChannel?.id);
  const videoSession = useWebRTC(activeVideoChannel?.id);
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
    if (selectedChannel.type === "voice") {
      return <VoicePanel channel={selectedChannel} voice={voiceSession} />;
    }
    if (selectedChannel.type === "video") {
      return <VideoPanel channel={selectedChannel} video={videoSession} />;
    }
    return (
      <Messages channelId={selectedChannel.id} memberMap={memberMap} />
    );
  }, [selectedChannel, voiceSession, videoSession]);

  const gridTemplateColumns = [
    collapseServers ? "56px" : "220px",
    collapseChannels ? "64px" : "240px",
    "1fr",
    collapseSocial ? "64px" : "280px",
  ].join(" ");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-slate-100">
            {selectedServer?.name || "Home"}
          </div>
          <div className="text-sm text-slate-400">
            {selectedChannel ? `#${selectedChannel.name}` : "Select a channel"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button onClick={() => setCollapseServers((v) => !v)} className="hover:text-gruvbox-orange">
            {collapseServers ? "Show Servers" : "Hide Servers"}
          </button>
          <button onClick={() => setCollapseChannels((v) => !v)} className="hover:text-gruvbox-orange">
            {collapseChannels ? "Show Channels" : "Hide Channels"}
          </button>
          <button onClick={() => setCollapseSocial((v) => !v)} className="hover:text-gruvbox-orange">
            {collapseSocial ? "Show Social" : "Hide Social"}
          </button>
          <button onClick={signOut} className="hover:text-gruvbox-orange">
            Logout
          </button>
        </div>
      </div>

      <div className="grid gap-3 h-[calc(100vh-240px)]" style={{ gridTemplateColumns }}>
        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          {!collapseServers ? (
            <ServerList
              onSelectServer={(server) => {
                setSelectedServer(server);
                setSelectedChannel(null);
              }}
            />
          ) : (
            <div className="text-xs text-slate-500">Servers</div>
          )}
          <div className="mt-3 text-xs text-slate-500">
            <Link to="/VideoChat" className="hover:text-gruvbox-orange">
              Video Chat
            </Link>
          </div>
        </aside>

        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          {!collapseChannels ? (
            <ChannelList
              serverId={selectedServer?.id}
              selectedChannelId={selectedChannel?.id}
              onSelectChannel={(channel) => {
                setSelectedChannel(channel);
                if (channel.type === "voice") {
                  setActiveVoiceChannel(channel);
                }
                if (channel.type === "video") {
                  setActiveVideoChannel(channel);
                }
              }}
            />
          ) : (
            <div className="text-xs text-slate-500">Channels</div>
          )}
        </aside>

        <main className="bg-slate-950/40 border border-slate-800 rounded p-4 flex flex-col">
          {renderChannelPanel}
        </main>

        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          {!collapseSocial ? (
            <>
              <FriendsList onMessage={(friend) => setSelectedFriend(friend)} />
              <div className="mt-6">
                <DMChat friend={selectedFriend} />
              </div>
              <AccountSettings serverId={selectedServer?.id} />
              <ServerProfilePanel server={selectedServer} memberMap={memberMap} />
            </>
          ) : (
            <div className="text-xs text-slate-500">Social</div>
          )}
        </aside>
      </div>

      <VoiceDock channel={activeVoiceChannel} voice={voiceSession} />
    </div>
  );
}

export default Home;
