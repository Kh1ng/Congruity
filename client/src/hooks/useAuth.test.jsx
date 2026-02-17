import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";

// Mock Supabase
vi.mock("@/lib/supabase", () => {
  const mockSubscription = { unsubscribe: vi.fn() };
  let authChangeCallback = null;

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        onAuthStateChange: vi.fn((callback) => {
          authChangeCallback = callback;
          return { data: { subscription: mockSubscription } };
        }),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        // Helper to trigger auth state changes in tests
        _triggerAuthChange: (event, session) => {
          if (authChangeCallback) {
            authChangeCallback(event, session);
          }
        },
      },
    },
  };
});

import { supabase } from "@/lib/supabase";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it.skip("throws error when used outside AuthProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      renderHook(() => useAuth());
    } catch (err) {
      expect(err.message).toMatch(/useAuth must be used/);
    }

    consoleSpy.mockRestore();
  });

  it("initializes with loading state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles successful sign in", async () => {
    const mockUser = { id: "123", email: "test@example.com" };
    const mockSession = { user: mockUser, access_token: "token123" };

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signIn("test@example.com", "password123");
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("handles sign in error", async () => {
    const mockError = new Error("Invalid credentials");
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("handles successful sign up", async () => {
    const mockUser = { id: "456", email: "new@example.com" };
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signUp("new@example.com", "password123", {
        name: "Test User",
      });
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        data: { name: "Test User" },
      },
    });
  });

  it("handles sign out", async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("updates state on auth state change", async () => {
    const mockUser = { id: "789", email: "auth@example.com" };
    const mockSession = { user: mockUser, access_token: "token789" };

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate auth state change
    act(() => {
      supabase.auth._triggerAuthChange("SIGNED_IN", mockSession);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
