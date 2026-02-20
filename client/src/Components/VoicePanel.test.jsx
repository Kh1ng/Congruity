import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VoicePanel from "./VoicePanel";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "local@example.com" },
  }),
}));

describe("VoicePanel", () => {
  it("does not render local camera tile by default when remote video is present", () => {
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
      isVideoOff: false,
      isScreenSharing: false,
      startCall: vi.fn(),
      endCall: vi.fn(),
      toggleMute: vi.fn(),
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

    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.getByText("remoteuser")).toBeInTheDocument();
  });
});
