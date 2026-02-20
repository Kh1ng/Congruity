import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useServers } from "./useServers";

// Mock useAuth - returns null user by default
vi.mock("./useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

describe("useServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty servers when user is not logged in", async () => {
    const { result } = renderHook(() => useServers());

    // Should immediately set loading to false when no user
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.servers).toEqual([]);
  });

  it("exposes CRUD functions", async () => {
    const { result } = renderHook(() => useServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.createServer).toBe("function");
    expect(typeof result.current.joinServer).toBe("function");
    expect(typeof result.current.leaveServer).toBe("function");
    expect(typeof result.current.deleteServer).toBe("function");
    expect(typeof result.current.refetch).toBe("function");
  });

  it("has correct initial state", () => {
    const { result } = renderHook(() => useServers());

    expect(result.current.servers).toEqual([]);
    expect(result.current.error).toBe(null);
  });
});
