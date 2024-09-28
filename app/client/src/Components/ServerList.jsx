import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; // Use React Router for navigation
import { getServerList } from "../Services/server";

function ServerList() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServers = async () => {
      const data = await getServerList();
      setServers(data);
      setLoading(false);
    };

    fetchServers();
  }, []);

  const handleServerClick = (serverId) => {
    navigate(`/server/${serverId}`);
  };

  if (loading) {
    return <div>Loading servers...</div>;
  }

  return (
    <div>
      <h1>Servers</h1>

      <ul>
        {servers.map((server) => (
          <li key={server.id} onClick={() => handleServerClick(server.id)}>
            <Link to={`/server/${server.id}`}>
              <img src={server.thumbnail} alt={`${server.name} thumbnail`} />
              {server.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ServerList;
