import React, { useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { useMessages } from "@/hooks";
import Spinner from "./Spinner";
import Avatar from "./Avatar";

const IMAGE_TYPES = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const AUDIO_TYPES = new Set(["mp3", "ogg", "wav"]);

function AttachmentPreview({ url }) {
  if (!url) return null;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (IMAGE_TYPES.has(ext)) {
    return (
      <img
        src={url}
        alt="attachment"
        className="mt-1 max-h-64 max-w-xs rounded-md object-contain"
        loading="lazy"
      />
    );
  }
  if (AUDIO_TYPES.has(ext)) {
    return (
      <audio controls src={url} className="mt-1 max-w-xs" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 block truncate text-xs text-theme-accent underline"
    >
      {url.split("/").pop()?.split("?")[0] || "attachment"}
    </a>
  );
}

function formatTimestamp(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderMessageContent(content) {
  if (!content) return null;
  const codeBlockMatch = content.match(/^```([\s\S]*?)```$/);
  if (codeBlockMatch) {
    return (
      <pre className="overflow-x-auto rounded-md bg-[color:var(--gruv-bg_hard)] px-3 py-2 text-sm leading-relaxed text-theme">
        <code>{codeBlockMatch[1].trim()}</code>
      </pre>
    );
  }
  return <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-theme">{content}</p>;
}

function Messages({ channelId, channel, memberMap = {} }) {
  const { messages, loading, error, sendMessage, sendAttachment } = useMessages(channelId);
  const [newMessage, setNewMessage] = useState("");
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(newMessage);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert(err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError(null);
    setUploading(true);
    try {
      await sendAttachment(file);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!channelId) {
    return <div className="text-slate-400">Select a channel to start chatting.</div>;
  }

  if (loading) {
    return (
      <div className="text-slate-400 flex items-center gap-2">
        <Spinner size={14} /> Loading messages...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-2 border-b border-theme pb-2">
        <div className="text-base font-semibold text-theme">
          #{channel?.name || "channel"}
        </div>
        <div className="text-xs text-[color:var(--gruv-fg3)]">
          {channel?.topic || "Welcome to the channel."}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="pt-2 text-sm text-theme-muted">No messages yet</div>
        ) : (
          <ul className="pb-2">
            {messages.map((message, index) => {
              const member = memberMap[message.user_id];
              const nickname = member?.nickname;
              const profile = member?.profile || message.profiles;
              const label =
                nickname ||
                profile?.display_name ||
                profile?.username ||
                profile?.id ||
                message.user_id;
              const avatarSrc = profile?.avatar_url || profile?.avatar;
              const prevMessage = messages[index - 1];
              const grouped =
                prevMessage &&
                prevMessage.user_id === message.user_id &&
                new Date(message.created_at || 0).getTime() -
                  new Date(prevMessage.created_at || 0).getTime() <
                  5 * 60 * 1000;

              return (
                <li
                  key={message.id}
                  className={grouped ? "ml-10 mt-1" : "mt-4 flex items-start gap-2"}
                >
                  {!grouped && <Avatar name={label} src={avatarSrc} size="md" />}
                  <div className="min-w-0">
                    {!grouped && (
                      <div className="mb-0.5 flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-theme">{label}</span>
                        <span className="text-[11px] text-[color:var(--gruv-fg3)]">
                          {formatTimestamp(message.created_at)}
                        </span>
                      </div>
                    )}
                    {message.content && renderMessageContent(message.content)}
                    <AttachmentPreview url={message.attachment_url} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-2 border-t border-theme pt-2">
        {uploadError && (
          <div className="mb-1 rounded bg-red-900/30 px-2 py-1 text-xs text-red-400">
            {uploadError}
          </div>
        )}
        <div className="relative flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/ogg,audio/wav"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image or audio"
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-theme-muted transition hover:bg-[color:var(--gruv-bg2)] hover:text-theme-accent disabled:opacity-50"
          >
            {uploading ? <Spinner size={14} /> : <Paperclip size={15} />}
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePostMessage();
                }
              }}
              placeholder={`Message #${channel?.name || "channel"}`}
              className="w-full rounded-lg border border-theme bg-[color:var(--gruv-bg1)] px-3 py-2 pr-10 text-theme placeholder:text-[color:var(--gruv-bg4)]"
            />
            {newMessage.trim().length > 0 && (
              <button
                onClick={handlePostMessage}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-theme-muted transition hover:bg-[color:var(--gruv-bg2)] hover:text-theme-accent"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
