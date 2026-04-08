import React, { useEffect, useState } from "react";
import { ConfigManager } from "@/lib/serverConfig";

/**
 * ConfigWizard — shown when no server config is present.
 *
 * Two entry points:
 *
 * 1. Fresh setup — user enters Supabase URL + anon key manually.
 * 2. Invite link — URL contains ?sc=BASE64&invite=CODE, which pre-fills the
 *    server config and carries the invite code through to post-login auto-join.
 *
 * After the wizard completes, `onComplete(pendingInviteCode)` is called.
 * App.jsx stores the pending invite code and uses it once the user logs in.
 *
 * Privacy: each server has its own Supabase instance. A server admin can only
 * see data in their own DB. Users create a local account per server — their
 * credentials on Server A are never shared with Server B.
 */
export function ConfigWizard({ onComplete }) {
  const [invite, setInvite] = useState(null); // { serverConfig, inviteCode } | null
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setAnonKey] = useState("");
  const [signalingUrl, setSignalingUrl] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Parse invite params on mount
  useEffect(() => {
    const parsed = ConfigManager.parseInviteUrl();
    if (parsed) {
      setInvite(parsed);
      setSupabaseUrl(parsed.serverConfig.supabaseUrl);
      setAnonKey(parsed.serverConfig.supabaseAnonKey);
      setSignalingUrl(parsed.serverConfig.signalingUrl || "");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const url = supabaseUrl.trim();
    const key = supabaseAnonKey.trim();

    if (!url || !key) {
      setError("Supabase URL and anon key are required.");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("Supabase URL is not a valid URL.");
      return;
    }

    setSaving(true);
    try {
      ConfigManager.saveConfig({
        supabaseUrl: url,
        supabaseAnonKey: key,
        signalingUrl: signalingUrl.trim() || null,
      });
      // Clear invite params from URL so refreshes don't re-trigger setup
      ConfigManager.clearInviteParams();
      onComplete?.(invite?.inviteCode || null);
    } catch (err) {
      setError(err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const isInviteFlow = Boolean(invite);

  return (
    <div className="flex min-h-screen items-center justify-center ui-app-bg p-6">
      <div className="w-full max-w-lg rounded-xl border border-theme bg-theme-surface p-6 shadow-xl">
        {isInviteFlow ? (
          <>
            <h1 className="text-2xl font-bold text-theme-accent">{"You've been invited"}</h1>
            <p className="mt-1 text-sm text-theme-muted">
              This link will connect you to a Congruity server. Sign up or log in to join.
            </p>
            <div className="mt-3 rounded border border-theme bg-theme-surface-alt px-3 py-2 text-xs text-theme-muted">
              <span className="font-medium text-theme">Server:</span>{" "}
              {invite.serverConfig.supabaseUrl}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-theme-accent">Welcome to Congruity</h1>
            <p className="mt-1 text-sm text-theme-muted">
              Connect to a self-hosted Supabase backend, or paste an invite link from a server admin.
            </p>
          </>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {!isInviteFlow && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-theme-muted">
                  Supabase URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  required
                  className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-theme-muted">
                  Supabase Anon Key
                </label>
                <input
                  type="text"
                  placeholder="eyJ..."
                  value={supabaseAnonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  required
                  className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-theme-muted">
                  Signaling Server URL{" "}
                  <span className="font-normal">(optional — for voice/video)</span>
                </label>
                <input
                  type="url"
                  placeholder="wss://your-server.example.com:3001"
                  value={signalingUrl}
                  onChange={(e) => setSignalingUrl(e.target.value)}
                  className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-accent"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-theme-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : isInviteFlow
                ? "Continue to sign in"
                : "Connect"}
          </button>
        </form>

        {!isInviteFlow && (
          <p className="mt-4 text-center text-xs text-theme-muted">
            Have an invite link?{" "}
            <span className="text-theme">Open it directly</span> — it will pre-fill this form.
          </p>
        )}
      </div>
    </div>
  );
}

export default ConfigWizard;
