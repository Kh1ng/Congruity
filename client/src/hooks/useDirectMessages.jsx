import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

/**
 * Hook for direct messages with a specific friend
 */
export function useDirectMessages(friendId) {
  const { user } = useAuth();
  const [dmChannelId, setDmChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ensureDmChannel = useCallback(async () => {
    if (!user || !friendId) return null;

    // Find existing DM channel that contains both users
    const { data: myMemberships, error: membershipError } = await supabase
      .from("dm_members")
      .select("channel_id")
      .eq("user_id", user.id);

    if (membershipError) throw membershipError;

    const channelIds = (myMemberships || []).map((m) => m.channel_id);
    if (channelIds.length > 0) {
      const { data: friendMemberships, error: friendError } = await supabase
        .from("dm_members")
        .select("channel_id")
        .eq("user_id", friendId)
        .in("channel_id", channelIds);

      if (friendError) throw friendError;

      if (friendMemberships?.length) {
        return friendMemberships[0].channel_id;
      }
    }

    // Create a new DM channel and add both users
    const { data: channel, error: channelError } = await supabase
      .from("dm_channels")
      .insert({})
      .select()
      .single();

    if (channelError) throw channelError;

    const { error: membersError } = await supabase.from("dm_members").insert([
      { channel_id: channel.id, user_id: user.id },
      { channel_id: channel.id, user_id: friendId },
    ]);

    if (membersError) throw membersError;

    return channel.id;
  }, [user, friendId]);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const channelId = await ensureDmChannel();
      setDmChannelId(channelId);

      if (!channelId) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("dm_messages")
        .select(`*, profiles:user_id(id, username, display_name, avatar_url)`)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching DMs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, friendId, ensureDmChannel]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(
    async (content) => {
      if (!user) throw new Error("Must be logged in");
      if (!friendId) throw new Error("No friend selected");
      if (!content.trim()) throw new Error("Message cannot be empty");

      const channelId = dmChannelId || (await ensureDmChannel());
      setDmChannelId(channelId);

      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setMessages((prev) => [...prev, data]);
      return data;
    },
    [user, friendId, dmChannelId, ensureDmChannel]
  );

  return {
    dmChannelId,
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}

export default useDirectMessages;
