import React, { useEffect, useState } from "react";
import { supabase, getCurrentUserId } from "../supabaseClient";

const fetchServers = async (userId) => {
  const { data, error } = await supabase.from("servers").select("id, name");
  if (error) {
    console.error("Error fetching servers:", error);
    return [];
  }

  return data;
};

function Servers() {
  const [servers, setServers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      if (userId) {
        const serverList = await fetchServers(userId);
        setServers(serverList);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl">Servers</h2>
      <ul>
        {servers.map((server) => (
          <li key={server.id}>
            <button onClick={() => console.log("Clicked server")}>
              {server.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Servers;
