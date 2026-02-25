import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { isDirectServerId } from "@/lib/directConnect";

const EMPTY_CHANNELS = [];

function isAbortLikeError(err) {
  const message = String(err?.message || "");
  const hint = String(err?.hint || "");
  return (
    err?.name === "AbortError" ||
    message.includes("AbortError") ||
    hint.includes("Request was aborted")
  );
}

/**
 * Hook for managing channels in a server
 * @param {string} serverId - The server to load channels for
 */
export function useChannels(serverId, options = {}) {
  const channelsOverride = Array.isArray(options?.channelsOverride)
    ? options.channelsOverride
    : null;
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch channels for the server
  const fetchChannels = useCallback(async () => {
    if (!serverId) {
      setChannels(channelsOverride || EMPTY_CHANNELS);
      setLoading(false);
      setError(null);
      return;
    }

    if (isDirectServerId(serverId)) {
      setChannels(channelsOverride || EMPTY_CHANNELS);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true });

      if (error) throw error;
      setChannels(data || []);
      setError(null);
    } catch (err) {
      if (isAbortLikeError(err)) {
        return;
      }
      console.error("Error fetching channels:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channelsOverride, serverId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  /**
   * Create a new channel
   * @param {string} name - Channel name
   * @param {string} type - Channel type ('text', 'voice', 'video')
   * @param {string} description - Optional description
   * @returns {Promise<Object>} Created channel
   */
  const createChannel = useCallback(
    async (name, type = "text", description = null) => {
      if (!serverId) throw new Error("No server selected");

      // Get max position
      const maxPosition = channels.reduce(
        (max, ch) => Math.max(max, ch.position || 0),
        0
      );

      const { data, error } = await supabase
        .from("channels")
        .insert({
          server_id: serverId,
          name,
          type,
          description,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchChannels();
      return data;
    },
    [serverId, channels, fetchChannels]
  );

  /**
   * Update a channel
   * @param {string} channelId - Channel ID to update
   * @param {Object} updates - Fields to update
   */
  const updateChannel = useCallback(
    async (channelId, updates) => {
      const { error } = await supabase
        .from("channels")
        .update(updates)
        .eq("id", channelId);

      if (error) throw error;
      await fetchChannels();
    },
    [fetchChannels]
  );

  /**
   * Delete a channel
   * @param {string} channelId - Channel ID to delete
   */
  const deleteChannel = useCallback(
    async (channelId) => {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;
      await fetchChannels();
    },
    [fetchChannels]
  );

  // Filter channels by type
  const textChannels = channels.filter((ch) => ch.type === "text");
  const voiceChannels = channels.filter((ch) => ch.type === "voice");
  const videoChannels = channels.filter((ch) => ch.type === "video");

  return {
    channels,
    textChannels,
    voiceChannels,
    videoChannels,
    loading,
    error,
    createChannel,
    updateChannel,
    deleteChannel,
    refetch: fetchChannels,
  };
}

export default useChannels;
