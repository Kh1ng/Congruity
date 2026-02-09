import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

function ServerList() {
  const { userId, authToken } = useAuth();
  const [servers, setServers] = useState([]); // Initialize state for servers
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch(`/api/servers/${userId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Fetched servers:", data);
          setServers(data);
        } else {
          console.error("Failed to fetch servers");
          setError("Failed to fetch servers");
        }
      } catch (error) {
        console.error("Error fetching servers:", error);
        setError("An error occurred while fetching servers");
      } finally {
        setLoading(false); // Ensure loading state is updated
      }
    };

    if (userId && authToken) {
      fetchServers();
    }
  }, [userId, authToken]);

  if (loading) {
    return <div>Loading servers...</div>; // Show loading state
  }

  if (error) {
    return <div className="text-red-500">{error}</div>; // Show error state
  }

  if (servers.length === 0) {
    return <div>No servers found.</div>; // Handle empty server list
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Server List</h1>
      <ul className="space-y-4">
        {servers.map((server) => (
          <li
            key={server.id}
            className="border border-gray-300 rounded p-4 shadow hover:shadow-md"
          >
            <h3 className="text-lg font-semibold">{server.name}</h3>
            <p>{server.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ServerList;
