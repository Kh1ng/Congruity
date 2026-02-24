import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useWebRTC } from "./useWebRTC";

const mockUser = { id: "user-1" };

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

function createMockStream() {
  const listeners = new Map();
  const audioTrack = {
    kind: "audio",
    enabled: true,
    readyState: "live",
    stop: vi.fn(),
    addEventListener: vi.fn((event, handler) => {
      listeners.set(event, handler);
    }),
    removeEventListener: vi.fn((event) => {
      listeners.delete(event);
    }),
  };

  return {
    __audioTrack: audioTrack,
    getTracks: () => [audioTrack],
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => [],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  };
}

function createMockSocket() {
  const handlers = {};
  return {
    id: "socket-local",
    connected: true,
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    __trigger: (event, payload) => {
      if (handlers[event]) handlers[event](payload);
    },
  };
}

describe("useWebRTC room sync", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const stream = createMockStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });
  });

  it("re-joins the latest room after reconnect", async () => {
    const { io } = await import("socket.io-client");
    const socket = createMockSocket();
    io.mockReturnValue(socket);

    const { result, rerender } = renderHook(
      ({ roomId }) => useWebRTC(roomId),
      {
        initialProps: { roomId: "room-a" },
      }
    );

    await act(async () => {
      await result.current.startCall({ video: false, audio: true });
    });

    act(() => {
      socket.__trigger("connect");
    });

    expect(socket.emit).toHaveBeenCalledWith("join-room", {
      roomId: "room-a",
      userId: "user-1",
    });

    rerender({ roomId: "room-b" });

    expect(socket.emit).toHaveBeenCalledWith("leave-room", { roomId: "room-a" });
    expect(socket.emit).toHaveBeenCalledWith("join-room", {
      roomId: "room-b",
      userId: "user-1",
    });

    socket.emit.mockClear();

    act(() => {
      socket.__trigger("disconnect");
    });

    act(() => {
      socket.__trigger("connect");
    });

    const reconnectJoinEvents = socket.emit.mock.calls.filter(([event]) => event === "join-room");
    expect(reconnectJoinEvents).toHaveLength(1);
    expect(reconnectJoinEvents[0][1]).toEqual({
      roomId: "room-b",
      userId: "user-1",
    });
  });

  it("maps microphone permission errors to a user-facing message", async () => {
    const { io } = await import("socket.io-client");
    io.mockReturnValue(createMockSocket());

    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce({
      name: "NotAllowedError",
      message: "Permission denied",
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useWebRTC("room-a"));

    await act(async () => {
      await expect(result.current.startCall({ video: false, audio: true })).rejects.toBeTruthy();
    });

    await waitFor(() => {
      expect(String(result.current.error)).toMatch(/Microphone permission denied/i);
    });
    errorSpy.mockRestore();
  });

  it("toggles mute and updates local audio track state", async () => {
    const { io } = await import("socket.io-client");
    const socket = createMockSocket();
    io.mockReturnValue(socket);

    const stream = createMockStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream);

    const { result } = renderHook(() => useWebRTC("room-a"));

    await act(async () => {
      await result.current.startCall({ video: false, audio: true });
    });

    expect(result.current.isMuted).toBe(false);
    expect(stream.__audioTrack.enabled).toBe(true);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);
    expect(stream.__audioTrack.enabled).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);
    expect(stream.__audioTrack.enabled).toBe(true);
  });

  it("endCall leaves the joined room and disconnects the socket", async () => {
    const { io } = await import("socket.io-client");
    const socket = createMockSocket();
    io.mockReturnValue(socket);

    const stream = createMockStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream);

    const { result } = renderHook(() => useWebRTC("room-a"));

    await act(async () => {
      await result.current.startCall({ video: false, audio: true });
    });

    act(() => {
      socket.__trigger("connect");
    });

    act(() => {
      result.current.endCall();
    });

    expect(socket.emit).toHaveBeenCalledWith("leave-room", { roomId: "room-a" });
    expect(socket.disconnect).toHaveBeenCalled();
    expect(stream.__audioTrack.stop).toHaveBeenCalled();
    expect(result.current.localStream).toBe(null);
    expect(result.current.isConnected).toBe(false);
  });
});
