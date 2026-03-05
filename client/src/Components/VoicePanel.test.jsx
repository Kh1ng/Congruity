import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VoicePanel from "./VoicePanel";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "local@example.com" },
  }),
}));

describe("VoicePanel", () => {
  it("renders leave controls and participant grid, and can leave call", () => {
    const channel = { id: "voice-1", name: "voice-lounge" };
    const liveTrack = { readyState: "live" };
    const localStream = {
      getVideoTracks: () => [liveTrack],
      getAudioTracks: () => [],
    };
    const remoteStream = {
      getVideoTracks: () => [liveTrack],
      getAudioTracks: () => [],
    };
    const voice = {
      isConnected: true,
      localStream,
      remoteStreams: [["socket-2", remoteStream]],
      error: null,
      isMuted: false,
      isDeafened: false,
      isVideoOff: false,
      isScreenSharing: false,
      startCall: vi.fn(),
      endCall: vi.fn(),
      toggleMute: vi.fn(),
      toggleDeafen: vi.fn(),
      toggleVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      roomUsers: [{ socketId: "socket-2", userId: "user-2" }],
    };
    const memberMap = {
      "user-1": { profile: { username: "localuser" } },
      "user-2": { profile: { username: "remoteuser" } },
    };

    render(<VoicePanel channel={channel} voice={voice} memberMap={memberMap} />);

    expect(screen.getByRole("button", { name: /leave call/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /leave/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("remoteuser")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /deafen/i }));
    expect(voice.toggleDeafen).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /leave call/i }));
    expect(voice.endCall).toHaveBeenCalled();
  });

  it("shows camera off label when participant has no live video", () => {
    const channel = { id: "voice-1", name: "voice-lounge" };
    const streamWithoutVideo = {
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    };
    const voice = {
      isConnected: true,
      localStream: streamWithoutVideo,
      remoteStreams: [],
      error: null,
      isMuted: false,
      isDeafened: false,
      isVideoOff: true,
      isScreenSharing: false,
      startCall: vi.fn(),
      endCall: vi.fn(),
      toggleMute: vi.fn(),
      toggleDeafen: vi.fn(),
      toggleVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      roomUsers: [],
    };
    const memberMap = {
      "user-1": { profile: { username: "localuser" } },
    };

    render(<VoicePanel channel={channel} voice={voice} memberMap={memberMap} />);
    expect(screen.getByText(/camera off/i)).toBeInTheDocument();
  });

  it("keeps local preview hidden by default and reveals on hover/right-click pin", () => {
    const channel = { id: "voice-1", name: "voice-lounge" };
    const liveTrack = { readyState: "live" };
    const localStream = {
      getVideoTracks: () => [liveTrack],
      getAudioTracks: () => [],
    };
    const voice = {
      isConnected: true,
      localStream,
      remoteStreams: [],
      error: null,
      isMuted: false,
      isDeafened: false,
      isVideoOff: false,
      isScreenSharing: false,
      startCall: vi.fn(),
      endCall: vi.fn(),
      toggleMute: vi.fn(),
      toggleDeafen: vi.fn(),
      toggleVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      roomUsers: [],
    };
    const memberMap = {
      "user-1": { profile: { username: "localuser" } },
    };

    render(<VoicePanel channel={channel} voice={voice} memberMap={memberMap} />);

    expect(screen.queryByText(/camera preview/i)).not.toBeInTheDocument();
    const localTile = screen.getByText("You").closest(".rounded-xl");
    fireEvent.mouseEnter(localTile);
    expect(screen.getByText(/camera preview/i)).toBeInTheDocument();

    fireEvent.contextMenu(localTile);
    fireEvent.mouseLeave(localTile);
    expect(screen.getByText(/camera preview/i)).toBeInTheDocument();
  });
});
