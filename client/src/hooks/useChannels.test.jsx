import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useChannels } from "./useChannels";

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
