import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VideoChat from "./VideoChat";

const startCallMock = vi.fn();
const endCallMock = vi.fn();
const toggleMuteMock = vi.fn();
const toggleVideoMock = vi.fn();
const startScreenShareMock = vi.fn();
const stopScreenShareMock = vi.fn();

let isConnectedValue = false;

vi.mock("@/hooks", () => ({
  useWebRTC: () => ({
    isConnected: isConnectedValue,
    localStream: null,
    remoteStreams: [],
    error: null,
    isMuted: false,
    isVideoOff: false,
    startCall: startCallMock,
    endCall: endCallMock,
    toggleMute: toggleMuteMock,
    toggleVideo: toggleVideoMock,
    startScreenShare: startScreenShareMock,
    stopScreenShare: stopScreenShareMock,
  }),
}));

describe("VideoChat", () => {
  it("join/leave", () => {
    isConnectedValue = false;
    const { rerender } = render(<VideoChat />);
    fireEvent.click(screen.getByRole("button", { name: /join room/i }));
    expect(startCallMock).toHaveBeenCalled();

    isConnectedValue = true;
    rerender(<VideoChat />);
    fireEvent.click(screen.getByRole("button", { name: /leave room/i }));
    expect(endCallMock).toHaveBeenCalled();
  });

  it("controls", () => {
    render(<VideoChat />);
    fireEvent.click(screen.getByRole("button", { name: /mute/i }));
    fireEvent.click(screen.getByRole("button", { name: /video off/i }));
    expect(toggleMuteMock).toHaveBeenCalled();
    expect(toggleVideoMock).toHaveBeenCalled();
  });

  it("screen share", () => {
    render(<VideoChat />);
    fireEvent.click(screen.getByRole("button", { name: /share screen/i }));
    fireEvent.click(screen.getByRole("button", { name: /stop share/i }));
    expect(startScreenShareMock).toHaveBeenCalled();
    expect(stopScreenShareMock).toHaveBeenCalled();
  });
});
