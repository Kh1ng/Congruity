import React, { useState, useEffect } from "react";
import getServersList from "../Services/channels"; // Adjust the path as necessary

function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setServers(getServersList()); // Use the service function
        setServers(servers);
      } catch (errors) {
        console.error("Error fetching servers list:", errors);
        setError("Failed to load servers", errors);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, [userId]);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl">Servers</h2>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-xl">Servers</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Servers</h1>
      <ul>
        {servers.map((server) => (
          <li key={server.id}>
            <div>Name: {server.name}</div>
            <div>Description: {server.description}</div>
            {server.thumbnail && (
              <img src={server.thumbnail} alt={`${server.name} Thumbnail`} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Servers;
