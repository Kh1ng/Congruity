import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

function AccountSettings({ serverId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      .upsert({
        id: user.id,
        username: username.trim(),
        display_name: displayName.trim(),
      });

    if (profileError) {
      setError(profileError.message);
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
    <div className="mt-6 border-t border-slate-800 pt-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Account</h3>
      <form onSubmit={handleSave} className="space-y-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (login & friends)"
          className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
          required
        />
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
        />
        {serverId && (
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Server nickname"
            className="w-full bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
          />
        )}
        <button
          type="submit"
          className="w-full text-sm font-medium hover:text-gruvbox-orange"
          disabled={saving || loading}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {error && <div className="text-xs text-red-400">{error}</div>}
        {success && <div className="text-xs text-green-400">{success}</div>}
      </form>
    </div>
  );
}

export default AccountSettings;
