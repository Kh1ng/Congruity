import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useServerBackend(serverId) {
  const [backend, setBackend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBackend = useCallback(async () => {
    if (!serverId) {
      setBackend(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("server_backends")
        .select(
          "server_id, backend_mode, signaling_url, storage_provider, storage_public_base_url, storage_bucket, storage_region"
        )
        .eq("server_id", serverId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setBackend(data || null);
      setError(null);
    } catch (err) {
      setError(err.message || "Unable to load server backend settings.");
      setBackend(null);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchBackend();
  }, [fetchBackend]);

  return {
    backend,
    loading,
    error,
    refetch: fetchBackend,
  };
}

export default useServerBackend;
