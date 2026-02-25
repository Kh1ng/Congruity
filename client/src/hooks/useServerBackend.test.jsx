import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  __resetServerBackendHookCacheForTests,
  useServerBackend,
} from "./useServerBackend";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useServerBackend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetServerBackendHookCacheForTests();
  });

  it("ignores missing server_backends table (404) and does not error", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        status: 404,
        message: "Could not find the table 'public.server_backends' in the schema cache",
      },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    supabase.from.mockReturnValue({ select });

    const { result } = renderHook(() => useServerBackend("srv-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.backend).toBe(null);
    expect(result.current.error).toBe(null);
    expect(supabase.from).toHaveBeenCalledWith("server_backends");
  });

  it("caches unsupported table state and skips repeated lookups", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          status: 404,
          message: "schema cache miss for server_backends",
        },
      })
      .mockResolvedValue({
        data: { server_id: "srv-2", signaling_url: "ws://localhost:3001" },
        error: null,
      });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    supabase.from.mockReturnValue({ select });

    const { result: first } = renderHook(() => useServerBackend("srv-1"));
    await waitFor(() => expect(first.current.loading).toBe(false));

    const { result: second } = renderHook(() => useServerBackend("srv-2"));
    await waitFor(() => expect(second.current.loading).toBe(false));

    expect(second.current.backend).toBe(null);
    expect(second.current.error).toBe(null);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

