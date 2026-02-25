import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ServerList from "./ServerList";

const createServerMock = vi.fn();
const joinServerMock = vi.fn();

let serversValue = [
  { id: "1", name: "Alpha", description: "Test server" },
  { id: "2", name: "Beta" },
];

vi.mock("@/hooks", () => ({
  useServers: () => ({
    servers: serversValue,
    loading: false,
    error: null,
    createServer: createServerMock,
    joinServer: joinServerMock,
  }),
}));

describe("ServerList", () => {
  it("renders servers", () => {
    render(<ServerList />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("empty state", () => {
    serversValue = [];

    render(<ServerList />);
    expect(screen.getByText(/no servers yet/i)).toBeInTheDocument();

    // reset
    serversValue = [
      { id: "1", name: "Alpha", description: "Test server" },
      { id: "2", name: "Beta" },
    ];
  });

  it("create server", async () => {
    render(<ServerList />);

    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    fireEvent.click(screen.getByRole("button", { name: /self-hosted/i }));

    const serverNameInput = await screen.findByPlaceholderText("Server name");

    await act(async () => {
      fireEvent.change(serverNameInput, {
        target: { value: "Gamma" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /create \(self-hosted\)/i }),
      );
    });

    expect(createServerMock).toHaveBeenCalledWith("Gamma", null, "self_hosted");
  });

  it("join server", async () => {
    render(<ServerList />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Invite code"), {
        target: { value: "INV123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /join/i }));
    });

    expect(joinServerMock).toHaveBeenCalledWith("INV123");
  });

  it("direct joins via signaling URL and selects local pseudo-server", async () => {
    const onSelectServer = vi.fn();
    render(<ServerList onSelectServer={onSelectServer} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Invite code"), {
        target: { value: "ws://localhost:3301" },
      });
      fireEvent.click(screen.getByRole("button", { name: /join/i }));
    });

    expect(joinServerMock).not.toHaveBeenCalledWith("ws://localhost:3301");
    expect(onSelectServer).toHaveBeenCalledWith(
      expect.objectContaining({
        isDirect: true,
        directConfig: expect.objectContaining({
          signaling_url: "ws://localhost:3301",
        }),
      }),
    );
    expect(screen.getByText("Direct (localhost:3301)")).toBeInTheDocument();
  });
});
