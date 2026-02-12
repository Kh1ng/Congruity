import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChannelList from "./ChannelList";

vi.mock("@/hooks", () => ({
  useChannels: () => ({
    textChannels: [{ id: "t1", name: "general" }],
    voiceChannels: [{ id: "v1", name: "lobby" }],
    videoChannels: [{ id: "vd1", name: "stage" }],
    loading: false,
    error: null,
  }),
}));

describe("ChannelList", () => {
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
