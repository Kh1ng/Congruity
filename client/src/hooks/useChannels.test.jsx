import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useChannels } from "./useChannels";
import { supabase } from "@/lib/supabase";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({
              data: [
                { id: "ch1", name: "general", type: "text", position: 1, server_id: "srv1" },
                { id: "ch2", name: "voice-chat", type: "voice", position: 2, server_id: "srv1" },
              ],
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "ch3", name: "new-channel", type: "text", position: 3 },
              error: null,
            })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe("useChannels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty channels when no serverId is provided", async () => {
    const { result } = renderHook(() => useChannels(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channels).toEqual([]);
    expect(result.current.textChannels).toEqual([]);
    expect(result.current.voiceChannels).toEqual([]);
  });

  it("uses local override channels for direct servers without hitting supabase", async () => {
    const directChannels = [
      { id: "direct-voice", name: "voice-lounge", type: "voice", position: 1 },
    ];
    const { result } = renderHook(() =>
      useChannels("direct:ws://localhost:3301", { channelsOverride: directChannels }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channels).toEqual(directChannels);
    expect(result.current.voiceChannels).toHaveLength(1);
    expect(result.current.textChannels).toEqual([]);
  });

  it("fetches channels for a server", async () => {
    const { result } = renderHook(() => useChannels("srv1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.channels).toHaveLength(2);
    expect(result.current.textChannels).toHaveLength(1);
    expect(result.current.voiceChannels).toHaveLength(1);
    expect(result.current.error).toBe(null);
  });

  it("does not refetch repeatedly on rerender with same non-direct server props", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    const { result, rerender } = renderHook(
      ({ serverId }) => useChannels(serverId),
      { initialProps: { serverId: "srv1" } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCalls = fromSpy.mock.calls.length;
    rerender({ serverId: "srv1" });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fromSpy.mock.calls.length).toBe(initialCalls);
  });

  it("ignores aborted fetch errors without surfacing channel error state", async () => {
    const abortingOrder = vi.fn(() =>
      Promise.reject({
        message: "AbortError: The operation was aborted.",
        hint: "Request was aborted (timeout or manual cancellation)",
      }),
    );
    const abortingEq = vi.fn(() => ({ order: abortingOrder }));
    const abortingSelect = vi.fn(() => ({ eq: abortingEq }));
    supabase.from.mockImplementationOnce(() => ({ select: abortingSelect }));

    const { result } = renderHook(() => useChannels("srv1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
  });

  it("filters channels by type", async () => {
    const { result } = renderHook(() => useChannels("srv1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.textChannels[0].name).toBe("general");
    expect(result.current.voiceChannels[0].name).toBe("voice-chat");
    expect(result.current.videoChannels).toHaveLength(0);
  });

  it("provides refetch function", async () => {
    const { result } = renderHook(() => useChannels("srv1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe("function");
    expect(typeof result.current.createChannel).toBe("function");
    expect(typeof result.current.updateChannel).toBe("function");
    expect(typeof result.current.deleteChannel).toBe("function");
  });
});
