import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isDirectServerId } from "@/lib/directConnect";

export function useServerMembers(serverId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!serverId) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (isDirectServerId(serverId)) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("server_members")
        .select(
          `user_id, nickname, role, profiles!server_members_user_id_fkey(id, username, display_name, avatar_url, status)`
        )
        .eq("server_id", serverId);

      if (error) throw error;
      setMembers(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching server members:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const memberMap = members.reduce((acc, member) => {
    acc[member.user_id] = {
      nickname: member.nickname,
      profile: member.profiles,
    };
    return acc;
  }, {});

  return {
    members,
    memberMap,
    loading,
    error,
    refetch: fetchMembers,
  };
}

export default useServerMembers;
