import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChannelList from "./ChannelList";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

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
    const fetchMock = vi.fn().mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/voice/channel/v1/participants")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            participants: [{ sid: "socket-2", identity: "user-2", name: "Other User" }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ rooms: [] }),
      });
    });

    vi.stubGlobal("fetch", fetchMock);

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
    expect(screen.getByText("👥 1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/voice/channel/v1/participants",
      expect.any(Object)
    );
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
