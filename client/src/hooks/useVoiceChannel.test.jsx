import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceChannel } from "./useVoiceChannel";

const getSessionMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args) => getSessionMock(...args),
    },
  },
}));

describe("useVoiceChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches participants from the signaling voice API with auth", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "token-123",
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        participants: [{ identity: "user-1", sid: "sid-1", name: "User One" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useVoiceChannel({ signalingUrl: "ws://localhost:3001" })
    );

    let participants;
    await act(async () => {
      participants = await result.current.listParticipants("voice-1");
    });

    expect(participants).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/voice/channel/voice-1/participants",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      })
    );
  });

  it("returns an auth error when join is attempted without a session token", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const { result } = renderHook(() =>
      useVoiceChannel({ signalingUrl: "ws://localhost:3001" })
    );

    let thrownError = null;
    await act(async () => {
      try {
        await result.current.join({ channelId: "voice-1", serverId: "server-1" });
      } catch (error) {
        thrownError = error;
      }
    });

    expect(String(thrownError?.message || thrownError)).toContain(
      "Missing auth token for voice request."
    );
    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });
});
