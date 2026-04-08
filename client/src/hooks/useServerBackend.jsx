import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isDirectServerId } from "@/lib/directConnect";

let serverBackendsTableUnsupported = false;

const isMissingServerBackendsTable = (fetchError) => {
  const code = String(fetchError?.code || "");
  const status = Number(fetchError?.status || fetchError?.statusCode || 0);
  const message = String(fetchError?.message || "");

  return (
    code === "PGRST205" ||
    status === 404 ||
    message.includes("schema cache") ||
    message.includes("server_backends")
  );
};

export function useServerBackend(serverId) {
  const [backend, setBackend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBackend = useCallback(async () => {
    if (!serverId) {
      setBackend(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (isDirectServerId(serverId)) {
      setBackend(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (serverBackendsTableUnsupported) {
      setBackend(null);
      setLoading(false);
      setError(null);
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

      if (fetchError) {
        // Cloud projects without the self-host migration return 404 for this table.
        if (isMissingServerBackendsTable(fetchError)) {
          serverBackendsTableUnsupported = true;
          setBackend(null);
          setError(null);
          return;
        }
        throw fetchError;
      }
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

export function __resetServerBackendHookCacheForTests() {
  serverBackendsTableUnsupported = false;
}

export default useServerBackend;
