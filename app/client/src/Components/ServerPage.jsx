import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getChannels } from "../Services/channels";
import Messages from "./Message";
import { getCurrentUserId } from "../supabaseClient";
import { getServerName } from "../Services/server";

function ServerPage() {
  const { serverId } = useParams();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [serverName, setServerName] = useState("");

  useEffect(() => {
    const fetchServerName = async () => {
      if (serverId) {
        const name = await getServerName(serverId);
        setServerName(name);
      }
    };

    const fetchChannels = async () => {
      if (serverId) {
        const data = await getChannels(serverId);
        setChannels(data);
      }
    };

    const getUserId = async () => {
      const id = await getCurrentUserId();
      setUserId(id);
      setLoading(false);
    };

    getUserId();
    fetchServerName();
    fetchChannels();
  }, [serverId]);

  if (loading) {
    return <div>Loading channels...</div>;
  }

  return (
    <div className="bg-gradient-to-bl from-slate-950 via-slate-700 to-slate-800 w-fill h-screen text-slate-200 p-10 mx-auto">
      <h1 className="text-xl w-full align-middle content-center">
        {serverName}
      </h1>
      <div className="border-slate-200 border-solid">
        <ul>
          {channels.map((channel) => (
            <li
              key={channel.id}
              onClick={() => setSelectedChannelId(channel.id)}
            >
              {channel.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        {selectedChannelId && (
          <Messages channelId={selectedChannelId} userId={userId} />
        )}
      </div>
    </div>
  );
}

export default ServerPage;
