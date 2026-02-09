import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook for managing servers the user belongs to
 */
export function useServers() {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch servers the user is a member of
  const fetchServers = useCallback(async () => {
    if (!user) {
      setServers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("servers")
        .select(`
          *,
          server_members!inner(user_id, role)
        `)
        .eq("server_members.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServers(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching servers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  /**
   * Create a new server
   * @param {string} name - Server name
   * @param {string} description - Optional description
   * @returns {Promise<Object>} Created server
   */
  const createServer = useCallback(
    async (name, description = null) => {
      if (!user) throw new Error("Must be logged in to create a server");

      const { data: server, error: serverError } = await supabase
        .from("servers")
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (serverError) throw serverError;

      // Add creator as owner member
      const { error: memberError } = await supabase
        .from("server_members")
        .insert({
          server_id: server.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // Create default general channel
      await supabase.from("channels").insert({
        server_id: server.id,
        name: "general",
        type: "text",
      });

      await fetchServers();
      return server;
    },
    [user, fetchServers]
  );

  /**
   * Join a server by invite code
   * @param {string} inviteCode - Server invite code
   * @returns {Promise<Object>} Joined server
   */
  const joinServer = useCallback(
    async (inviteCode) => {
      if (!user) throw new Error("Must be logged in to join a server");

      // Find server by invite code
      const { data: server, error: findError } = await supabase
        .from("servers")
        .select()
        .eq("invite_code", inviteCode)
        .single();

      if (findError) throw new Error("Invalid invite code");

      // Check if already a member
      const { data: existing } = await supabase
        .from("server_members")
        .select()
        .eq("server_id", server.id)
        .eq("user_id", user.id)
        .single();

      if (existing) throw new Error("Already a member of this server");

      // Join the server
      const { error: joinError } = await supabase
        .from("server_members")
        .insert({
          server_id: server.id,
          user_id: user.id,
          role: "member",
        });

      if (joinError) throw joinError;

      await fetchServers();
      return server;
    },
    [user, fetchServers]
  );

  /**
   * Leave a server
   * @param {string} serverId - Server ID to leave
   */
  const leaveServer = useCallback(
    async (serverId) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("server_members")
        .delete()
        .eq("server_id", serverId)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchServers();
    },
    [user, fetchServers]
  );

  /**
   * Delete a server (owner only)
   * @param {string} serverId - Server ID to delete
   */
  const deleteServer = useCallback(
    async (serverId) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("servers")
        .delete()
        .eq("id", serverId)
        .eq("owner_id", user.id);

      if (error) throw error;
      await fetchServers();
    },
    [user, fetchServers]
  );

  return {
    servers,
    loading,
    error,
    createServer,
    joinServer,
    leaveServer,
    deleteServer,
    refetch: fetchServers,
  };
}

export default useServers;
