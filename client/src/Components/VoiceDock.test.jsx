import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VoiceDock from "./VoiceDock";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
  }),
}));

describe("VoiceDock", () => {
  it("shows room user count and list", () => {
    const channel = { id: "c1", name: "general" };
    const voice = {
      isConnected: true,
      isMuted: false,
      isVideoOff: true,
      isScreenSharing: false,
      toggleMute: vi.fn(),
      toggleVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      endCall: vi.fn(),
      roomUsers: ["abc123", "def456"],
      remoteStreams: [],
      localStream: null,
      stageStreamIds: [],
      setStageStreamIds: vi.fn(),
    };

    render(<VoiceDock channel={channel} voice={voice} memberMap={{}} />);

    expect(screen.getByText(/Connected/)).toBeInTheDocument();
    expect(screen.queryByText(/In room:/)).not.toBeInTheDocument();
    expect(screen.getByTitle(/abc123/)).toBeInTheDocument();
    expect(screen.getByTitle(/def456/)).toBeInTheDocument();
  });

  it("renders compact embedded controls with theme token classes", () => {
    const channel = { id: "c1", name: "voice-lounge" };
    const voice = {
      isConnected: true,
      isMuted: false,
      isVideoOff: true,
      isScreenSharing: false,
      toggleMute: vi.fn(),
      toggleVideo: vi.fn(),
      startScreenShare: vi.fn(),
      stopScreenShare: vi.fn(),
      endCall: vi.fn(),
      roomUsers: ["abc123"],
      remoteStreams: [],
      localStream: null,
      stageStreamIds: [],
      setStageStreamIds: vi.fn(),
    };

    const { container } = render(
      <VoiceDock channel={channel} voice={voice} memberMap={{}} embedded />
    );

    expect(container.firstChild).toHaveClass("border-theme", "bg-theme-surface-alt/70");
    expect(screen.getAllByTitle(/mute|unmute/i)).toHaveLength(1);
  });
});
