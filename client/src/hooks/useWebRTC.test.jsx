import { act, renderHook } from "@testing-library/react";
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
  const audioTrack = {
    kind: "audio",
    enabled: true,
    readyState: "live",
    stop: vi.fn(),
  };

  return {
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
});
