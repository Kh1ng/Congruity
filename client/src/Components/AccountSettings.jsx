import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const CUSTOM_THEME_FIELDS = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "surface-alt", label: "Surface Alt" },
  { key: "text", label: "Text" },
  { key: "text-muted", label: "Text Muted" },
  { key: "border", label: "Border" },
  { key: "accent", label: "Accent" },
  { key: "accent-2", label: "Accent 2" },
];

function AccountSettings({ serverId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { theme, setTheme, options: themeOptions, customPalette, setCustomColor, resetCustomPalette } =
    useTheme();

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        setError(profileError.message);
      } else if (profile) {
        setUsername(profile.username || "");
        setDisplayName(profile.display_name || "");
      }

      if (serverId) {
        const { data: member, error: memberError } = await supabase
          .from("server_members")
          .select("nickname")
          .eq("server_id", serverId)
          .eq("user_id", user.id)
          .single();

        if (!memberError && member) {
          setNickname(member.nickname || "");
        }
      }

      setLoading(false);
    };

    load();
  }, [user, serverId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        display_name: displayName.trim(),
      })
      .eq("id", user.id);

    if (profileError) {
      setError(
        profileError.message.includes("row-level security")
          ? "Profile update blocked by RLS policy. Theme changes are still saved locally."
          : profileError.message
      );
      setSaving(false);
      return;
    }

    if (serverId) {
      const { error: memberError } = await supabase
        .from("server_members")
        .update({ nickname: nickname.trim() || null })
        .eq("server_id", serverId)
        .eq("user_id", user.id);

      if (memberError) {
        setError(memberError.message);
        setSaving(false);
        return;
      }
    }

    setSuccess("Updated settings");
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="mt-6 border-t border-theme pt-4">
      <h3 className="mb-2 text-sm font-semibold text-theme">Account</h3>
      <div className="mb-3 rounded border border-theme bg-theme-surface-alt/40 p-3">
        <label className="text-xs font-semibold text-theme-muted">Theme preset</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="theme-control mt-1 w-full rounded px-3 py-2 text-sm"
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mt-1 text-xs text-theme-muted">
          Applies instantly and saves to this device.
        </div>
        {theme === "custom" && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {CUSTOM_THEME_FIELDS.map((field) => (
                <label key={field.key} className="text-xs text-theme-muted">
                  <span>{field.label}</span>
                  <input
                    type="color"
                    value={customPalette[field.key]}
                    onChange={(e) => setCustomColor(field.key, e.target.value)}
                    className="mt-1 h-8 w-full cursor-pointer rounded border border-theme bg-theme-surface"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className="text-xs text-theme-muted transition hover:text-theme-accent"
              onClick={resetCustomPalette}
            >
              Reset custom palette
            </button>
          </div>
        )}
      </div>
      <form onSubmit={handleSave} className="space-y-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (login & friends)"
          className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme"
          required
        />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme"
        />
        {serverId && (
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Server nickname"
            className="w-full rounded border border-theme bg-theme-surface-alt px-3 py-2 text-sm text-theme"
          />
        )}
        <button
          type="submit"
          className="w-full text-sm font-medium text-theme-muted transition hover:text-theme-accent"
          disabled={saving || loading}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {error && <div className="text-xs text-red-400">{error}</div>}
        {success && <div className="text-xs text-green-400">{success}</div>}
      </form>
    </div>
  );
}

export default AccountSettings;
