import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VoiceDock from "./VoiceDock";

describe("VoiceDock", () => {
  it("shows room user count and list", () => {
    const channel = { id: "c1", name: "general" };
    const voice = {
      isConnected: true,
      isMuted: false,
      toggleMute: vi.fn(),
      endCall: vi.fn(),
      roomUsers: ["abc123", "def456"],
    };

    render(<VoiceDock channel={channel} voice={voice} />);

    expect(screen.getByText(/Connected/)).toBeInTheDocument();
    expect(screen.getByText(/In room: 2/)).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(screen.getByText(/def456/)).toBeInTheDocument();
  });
});
