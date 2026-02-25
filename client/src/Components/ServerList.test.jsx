import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ServerList from "./ServerList";

const createServerMock = vi.fn();
const joinServerMock = vi.fn();
const leaveServerMock = vi.fn();
const deleteServerMock = vi.fn();

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
    leaveServer: leaveServerMock,
    deleteServer: deleteServerMock,
  }),
}));

describe("ServerList", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    createServerMock.mockReset();
    joinServerMock.mockReset();
    leaveServerMock.mockReset();
    deleteServerMock.mockReset();
    confirmSpy.mockReset();
    confirmSpy.mockReturnValue(true);
    if (typeof localStorage.removeItem === "function") {
      localStorage.removeItem("congruity_direct_servers");
    }
    serversValue = [
      {
        id: "1",
        name: "Alpha",
        description: "Test server",
        server_members: [{ role: "owner" }],
      },
      { id: "2", name: "Beta", server_members: [{ role: "member" }] },
    ];
  });

  it("renders servers", () => {
    render(<ServerList />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("empty state", () => {
    serversValue = [];

    render(<ServerList />);
    expect(screen.getByText(/no servers yet/i)).toBeInTheDocument();

    // reset in beforeEach
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

  it("leaves a non-owned server", async () => {
    render(<ServerList />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(leaveServerMock).toHaveBeenCalledWith("2");
    expect(deleteServerMock).not.toHaveBeenCalled();
  });

  it("deletes an owned server", async () => {
    render(<ServerList />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteServerMock).toHaveBeenCalledWith("1");
    expect(leaveServerMock).not.toHaveBeenCalled();
  });

  it("removes a direct pseudo-server locally", async () => {
    render(<ServerList />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("Invite code"), {
        target: { value: "ws://localhost:3301" },
      });
      fireEvent.click(screen.getByRole("button", { name: /join/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByText("Direct (localhost:3301)")).not.toBeInTheDocument();
    expect(leaveServerMock).not.toHaveBeenCalled();
    expect(deleteServerMock).not.toHaveBeenCalled();
  });
});
