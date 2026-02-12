import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import FriendsList from "./FriendsList";
import ServerList from "./ServerList";
import ChannelList from "./ChannelList";
import DMChat from "./DMChat";

function Home() {
  const { signOut } = useAuth();
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);

  return (
    <div>
      <div className="flex flex-row gap-20 pb-20">
        <Link to="/">Soon(tm)</Link>
        <span> | </span>
        <Link to="/VideoChat">Video Chat</Link>
        <span> | </span>
        <div>Stuff</div>
        <span> | </span>
        <div>More Stuff</div>
        <button onClick={signOut} className="hover:text-gruvbox-orange">Logout</button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <FriendsList onMessage={(friend) => setSelectedFriend(friend)} />
        </div>
        <div className="space-y-6">
          <ChannelList serverId={selectedServer?.id} />
          <DMChat friend={selectedFriend} />
        </div>
        <div>
          <ServerList onSelectServer={(server) => setSelectedServer(server)} />
        </div>
      </div>
    </div>
  );
}

export default Home;
