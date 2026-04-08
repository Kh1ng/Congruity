import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

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
 * Hook for managing messages in a channel with realtime updates
 * @param {string} channelId - The channel to load messages for
 */
export function useMessages(channelId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles!messages_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
      setError(null);
    } catch (err) {
      if (isAbortLikeError(err)) {
        setError(null);
        return;
      }
      console.error("Error fetching messages:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!channelId) return;

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with profile data
          const { data: newMessage } = await supabase
            .from("messages")
            .select(`
              *,
              profiles!messages_user_id_fkey(id, username, display_name, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [channelId, fetchMessages]);

  /**
   * Send a new message
   * @param {string} content - Message content
   * @returns {Promise<Object>} Created message
   */
  const sendMessage = useCallback(
    async (content) => {
      if (!user) throw new Error("Must be logged in to send messages");
      if (!channelId) throw new Error("No channel selected");
      if (!content.trim()) throw new Error("Message cannot be empty");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    [user, channelId]
  );

  /**
   * Upload a file and send it as a message attachment.
   * @param {File} file - The file to upload (image/gif/audio)
   * @param {string} [caption] - Optional text caption
   * @returns {Promise<Object>} Created message
   */
  const sendAttachment = useCallback(
    async (file, caption) => {
      if (!user) throw new Error("Must be logged in to send attachments");
      if (!channelId) throw new Error("No channel selected");

      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) throw new Error("File exceeds 50 MB limit");

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${channelId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        if (uploadError.message?.includes("Payload too large") ||
            uploadError.statusCode === 413) {
          throw new Error("Storage quota exceeded — file too large");
        }
        if (uploadError.statusCode === 507 ||
            uploadError.message?.includes("quota") ||
            uploadError.message?.includes("storage full")) {
          throw new Error("Storage is full — contact your server admin");
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const attachmentUrl = urlData?.publicUrl;
      if (!attachmentUrl) throw new Error("Failed to get public URL for attachment");

      const { data, error: insertError } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: caption?.trim() || null,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    [user, channelId]
  );

  /**
   * Edit a message (own messages only)
   * @param {string} messageId - Message ID to edit
   * @param {string} content - New content
   */
  const editMessage = useCallback(
    async (messageId, content) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("messages")
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    [user]
  );

  /**
   * Delete a message
   * @param {string} messageId - Message ID to delete
   */
  const deleteMessage = useCallback(
    async (messageId) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    [user]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendAttachment,
    editMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
}

export default useMessages;
