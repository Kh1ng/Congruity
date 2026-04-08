import React, { useState } from "react";
import { ConfigManager } from "@/lib/serverConfig";

/**
 * First-run setup wizard.
 *
 * Shown when ConfigManager.needsConfiguration() returns true — i.e., no Supabase
 * credentials are available from localStorage or build-time env vars.
 *
 * Supports two flows:
 *   1. Self-hosted: user enters their Supabase URL, anon key, and optional signaling URL.
 *   2. Direct connect: user pastes a `congruity://join?signal=...` link or a raw ws:// URL.
 */
export function ConfigWizard({ onComplete }) {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setAnonKey] = useState("");
  const [signalingUrl, setSignalingUrl] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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
        signalingUrl: signalingUrl.trim() || undefined,
      });
      onComplete?.();
    } catch (err) {
      setError(err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-bg p-6">
      <div className="w-full max-w-lg rounded-xl border border-theme bg-theme-surface p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-theme-accent">Welcome to Congruity</h1>
        <p className="mt-1 text-sm text-theme-muted">
          Connect to your self-hosted Supabase backend to get started.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
              <span className="font-normal text-theme-muted">(optional — for voice/video)</span>
            </label>
            <input
              type="url"
              placeholder="wss://your-server.example.com:3001"
              value={signalingUrl}
              onChange={(e) => setSignalingUrl(e.target.value)}
              className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-accent"
            />
          </div>

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
            {saving ? "Saving…" : "Connect"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-theme-muted">
          Need help?{" "}
          <a
            href="https://github.com/coltonspurgin/congruity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-theme-accent hover:underline"
          >
            View self-hosting guide
          </a>
        </p>
      </div>
    </div>
  );
}

export default ConfigWizard;
