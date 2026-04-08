import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDMCall } from "./useDMCall";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getSessionMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args) => getSessionMock(...args),
    },
  },
}));

let mockSocketListeners = {};
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn((event, handler) => {
    mockSocketListeners[event] = handler;
  }),
  off: vi.fn((event) => {
    delete mockSocketListeners[event];
  }),
  disconnect: vi.fn(),
};
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "local-user-1", email: "local@example.com" } }),
}));

// Mock RTCPeerConnection and MediaDevices
const mockTrack = { kind: "audio", enabled: true, stop: vi.fn() };
const mockVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };
const mockStream = {
  getTracks: () => [mockTrack, mockVideoTrack],
  getAudioTracks: () => [mockTrack],
  getVideoTracks: () => [mockVideoTrack],
};

const mockPcMethods = {
  createOffer: vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" })),
  createAnswer: vi.fn(async () => ({ type: "answer", sdp: "answer-sdp" })),
  setLocalDescription: vi.fn(async () => {}),
  setRemoteDescription: vi.fn(async () => {}),
  addIceCandidate: vi.fn(async () => {}),
  addTrack: vi.fn(),
  getSenders: vi.fn(function() { return []; }),
  close: vi.fn(),
};

// Use regular functions (not arrows) for constructors — Vitest 4 requires this
global.RTCPeerConnection = function MockRTCPeerConnection() {
  this.onicecandidate = null;
  this.ontrack = null;
  Object.assign(this, mockPcMethods);
};
global.RTCSessionDescription = function MockRTCSessionDescription(desc) {
  return desc;
};
global.RTCIceCandidate = function MockRTCIceCandidate(cand) {
  return cand;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authWithToken(token = "auth-token") {
  getSessionMock.mockResolvedValue({ data: { session: { access_token: token } } });
}

function authNoSession() {
  getSessionMock.mockResolvedValue({ data: { session: null } });
}

function fetchOk(body = {}) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => body });
}

function stubGetUserMedia(stream) {
  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDMCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketListeners = {};
    mockPcMethods.createOffer.mockResolvedValue({ type: "offer", sdp: "offer-sdp" });
    mockPcMethods.createAnswer.mockResolvedValue({ type: "answer", sdp: "answer-sdp" });
    mockPcMethods.setLocalDescription.mockResolvedValue(undefined);
    mockPcMethods.setRemoteDescription.mockResolvedValue(undefined);
    mockPcMethods.addIceCandidate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in idle state with no remote user", () => {
    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));
    expect(result.current.state).toBe("idle");
    expect(result.current.remoteUserId).toBeNull();
    expect(result.current.localStream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("transitions to 'calling' state when call() is invoked", async () => {
    authWithToken();
    vi.stubGlobal("fetch", fetchOk({ delivered: 1, turn_credentials: null }));
    stubGetUserMedia(mockStream);

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      result.current.call("remote-user-2");
    });

    await waitFor(() => {
      // calling or connected (offer sent transitions through calling)
      expect(["calling", "connected", "ended"]).toContain(result.current.state);
    });
    expect(result.current.remoteUserId).toBe("remote-user-2");
  });

  it("sends an offer signal via the DM signal API on call()", async () => {
    authWithToken();
    const fetchMock = fetchOk({ delivered: 1, turn_credentials: null });
    vi.stubGlobal("fetch", fetchMock);
    stubGetUserMedia(mockStream);

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      await result.current.call("remote-user-2");
    });

    const offerCall = fetchMock.mock.calls.find(([url, init]) => {
      const body = JSON.parse(init?.body || "{}");
      return url.includes("/api/voice/dm/signal") && body.signal_type === "offer";
    });
    expect(offerCall).toBeTruthy();
  });

  it("transitions to 'ringing' when dm:call:incoming socket event is received", async () => {
    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    act(() => {
      mockSocketListeners["dm:call:incoming"]?.({
        from_user_id: "caller-user",
        display_name: "Caller",
        offer: { type: "offer", sdp: "..." },
      });
    });

    await waitFor(() => {
      expect(result.current.state).toBe("ringing");
    });
    expect(result.current.remoteUserId).toBe("caller-user");
    expect(result.current.remoteDisplayName).toBe("Caller");
  });

  it("transitions to 'ended' when dm:call:hangup socket event is received", async () => {
    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    // First get into ringing state
    act(() => {
      mockSocketListeners["dm:call:incoming"]?.({
        from_user_id: "caller-user",
        display_name: "Caller",
        offer: { type: "offer", sdp: "..." },
      });
    });

    await waitFor(() => expect(result.current.state).toBe("ringing"));

    act(() => {
      mockSocketListeners["dm:call:hangup"]?.({ from_user_id: "caller-user" });
    });

    await waitFor(() => expect(result.current.state).toBe("ended"));
  });

  it("hangup() sends hangup signal and transitions to 'ended'", async () => {
    authWithToken();
    const fetchMock = fetchOk({ delivered: 1, turn_credentials: null });
    vi.stubGlobal("fetch", fetchMock);
    stubGetUserMedia(mockStream);

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      await result.current.call("remote-user-2");
    });

    await act(async () => {
      await result.current.hangup();
    });

    await waitFor(() => expect(result.current.state).toBe("ended"));

    const hangupCall = fetchMock.mock.calls.find(([, init]) => {
      const body = JSON.parse(init?.body || "{}");
      return body.signal_type === "hangup";
    });
    expect(hangupCall).toBeTruthy();
  });

  it("toggleMute() disables the audio track and sets isMuted", async () => {
    authWithToken();
    vi.stubGlobal("fetch", fetchOk({ delivered: 1, turn_credentials: null }));

    const audioTrack = { kind: "audio", enabled: true, stop: vi.fn() };
    const videoTrack = { kind: "video", enabled: true, stop: vi.fn() };
    const stream = {
      getTracks: () => [audioTrack, videoTrack],
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [videoTrack],
    };
    stubGetUserMedia(stream);

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      await result.current.call("remote-user-2");
    });

    act(() => {
      result.current.toggleMute();
    });

    await waitFor(() => expect(result.current.isMuted).toBe(true));
    expect(audioTrack.enabled).toBe(false);
  });

  it("toggleVideo() disables the video track and sets isVideoOn to false", async () => {
    authWithToken();
    vi.stubGlobal("fetch", fetchOk({ delivered: 1, turn_credentials: null }));

    const videoTrack = { kind: "video", enabled: true, stop: vi.fn() };
    const stream = {
      getTracks: () => [videoTrack],
      getAudioTracks: () => [],
      getVideoTracks: () => [videoTrack],
    };
    stubGetUserMedia(stream);

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      await result.current.call("remote-user-2");
    });

    act(() => {
      result.current.toggleVideo();
    });

    await waitFor(() => expect(result.current.isVideoOn).toBe(false));
    expect(videoTrack.enabled).toBe(false);
  });

  it("call() sets error and transitions to 'ended' when auth token is missing", async () => {
    authNoSession();
    vi.stubGlobal("fetch", fetchOk({}));

    const { result } = renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await act(async () => {
      await result.current.call("remote-user-2");
    });

    await waitFor(() => expect(result.current.state).toBe("ended"));
    expect(result.current.error).toBeTruthy();
  });

  it("emits auth:identify with user id and access token when socket connects", async () => {
    authWithToken("socket-auth-token");
    renderHook(() => useDMCall({ signalingUrl: "ws://localhost:3001" }));

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith("auth:identify", {
        userId: "local-user-1",
        accessToken: "socket-auth-token",
      });
    });
  });
});
