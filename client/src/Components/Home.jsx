import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import FriendsList from "./FriendsList";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import DMChat from "./DMChat";
import Messages from "./Message";
import VoiceChat from "./VoiceChat";
import VideoChannel from "./VideoChannel";

function Home() {
  const { signOut } = useAuth();
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);

  const renderChannelPanel = () => {
    if (!selectedChannel) return <Messages channelId={null} />;
    if (selectedChannel.type === "voice") {
      return <VoiceChat channelId={selectedChannel.id} />;
    }
    if (selectedChannel.type === "video") {
      return <VideoChannel channelId={selectedChannel.id} />;
    }
    return <Messages channelId={selectedChannel.id} />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <Link to="/" className="hover:text-gruvbox-orange">
            Soon(tm)
          </Link>
          <span>•</span>
          <Link to="/VideoChat" className="hover:text-gruvbox-orange">
            Video Chat
          </Link>
        </div>
        <button onClick={signOut} className="text-sm hover:text-gruvbox-orange">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-[220px_240px_1fr_280px] gap-4 h-[calc(100vh-180px)]">
        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          <ServerList
            onSelectServer={(server) => {
              setSelectedServer(server);
              setSelectedChannel(null);
            }}
          />
        </aside>

        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          <ChannelList
            serverId={selectedServer?.id}
            selectedChannelId={selectedChannel?.id}
            onSelectChannel={(channel) => setSelectedChannel(channel)}
          />
        </aside>

        <main className="bg-slate-950/40 border border-slate-800 rounded p-4 flex flex-col">
          {renderChannelPanel()}
        </main>

        <aside className="bg-slate-950/40 border border-slate-800 rounded p-3 overflow-y-auto">
          <FriendsList onMessage={(friend) => setSelectedFriend(friend)} />
          <div className="mt-6">
            <DMChat friend={selectedFriend} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Home;
