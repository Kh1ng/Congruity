import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMessages } from "./useMessages";

// Mock useAuth
vi.mock("./useAuth", () => ({
  useAuth: () => ({
    user: { id: "user1", email: "test@example.com" },
  }),
}));

// Mock Supabase
const mockSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }));
const mockOn = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "msg1",
                    content: "Hello",
                    user_id: "user1",
                    channel_id: "ch1",
                    created_at: "2024-01-01T00:00:00Z",
                    profiles: { id: "user1", username: "testuser" },
                  },
                  {
                    id: "msg2",
                    content: "World",
                    user_id: "user2",
                    channel_id: "ch1",
                    created_at: "2024-01-01T00:01:00Z",
                    profiles: { id: "user2", username: "otheruser" },
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "msg3", content: "New message", user_id: "user1" },
              error: null,
            })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    channel: vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe })),
    removeChannel: vi.fn(),
  },
}));

describe("useMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty messages when no channelId is provided", async () => {
    const { result } = renderHook(() => useMessages(null));

    // With null channelId, messages should be empty (loading may remain true since useEffect doesn't fetch)
    await waitFor(() => {
      expect(result.current.messages).toEqual([]);
    });

    expect(result.current.error).toBe(null);
  });

  it("fetches messages for a channel", async () => {
    const { result } = renderHook(() => useMessages("ch1"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("Hello");
    expect(result.current.messages[1].content).toBe("World");
  });

  it("provides message functions", async () => {
    const { result } = renderHook(() => useMessages("ch1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.sendMessage).toBe("function");
    expect(typeof result.current.editMessage).toBe("function");
    expect(typeof result.current.deleteMessage).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
  });

  it("includes profile data with messages", async () => {
    const { result } = renderHook(() => useMessages("ch1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages[0].profiles.username).toBe("testuser");
  });
});
