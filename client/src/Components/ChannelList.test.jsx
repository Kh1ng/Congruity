import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChannelList from "./ChannelList";

vi.mock("../hooks", () => ({
  useChannels: () => ({
    textChannels: [{ id: "t1", name: "general" }],
    voiceChannels: [{ id: "v1", name: "lobby" }],
    videoChannels: [{ id: "vd1", name: "stage" }],
    loading: false,
    error: null,
  }),
}));

describe("ChannelList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows voice participants before local join from signaling presence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rooms: [
            {
              roomId: "v1",
              users: [{ socketId: "socket-2", userId: "user-2" }],
            },
          ],
        }),
      })
    );

    render(
      <ChannelList
        serverId="s1"
        signalingUrl="ws://localhost:3001"
        memberMap={{
          "user-2": {
            profile: {
              display_name: "Other User",
            },
          },
        }}
      />
    );

    expect(await screen.findByText("Other User")).toBeInTheDocument();
  });

  it("renders channel groups", () => {
    render(<ChannelList serverId="s1" />);
    expect(screen.getByText(/general/i)).toBeInTheDocument();
    expect(screen.getByText(/lobby/i)).toBeInTheDocument();
    expect(screen.getByText(/stage/i)).toBeInTheDocument();
  });

  it("select channel", () => {
    const onSelectChannel = vi.fn();
    render(<ChannelList serverId="s1" onSelectChannel={onSelectChannel} />);
    fireEvent.click(screen.getByText(/general/i));
    expect(onSelectChannel).toHaveBeenCalled();
  });
});
