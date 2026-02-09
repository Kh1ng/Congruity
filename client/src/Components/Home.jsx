import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import FriendsList from "./FriendsList";
import Servers from "./ServerList";

function Home() {
  const { signOut } = useAuth();

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
      <div className="grid grid-cols-3">
        <div>
          <FriendsList />
        </div>
        <div>
          <h2>The Feed</h2>
        </div>
        <div>
          <Servers />
        </div>
      </div>
    </div>
  );
}

export default Home;
