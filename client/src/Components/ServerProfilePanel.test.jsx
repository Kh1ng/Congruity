import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ServerProfilePanel from "./ServerProfilePanel";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockServer = { id: "s1", name: "Test Server" };

describe("ServerProfilePanel", () => {
  it("renders server profile info", () => {
    const memberMap = {
      u1: {
        nickname: "Colt",
        role: "owner",
        profile: { display_name: "Colton", username: "colt" },
      },
    };

    render(
      <ServerProfilePanel
        server={mockServer}
        memberMap={memberMap}
      />
    );

    expect(screen.getByText(/server profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Colton/)).toBeInTheDocument();
    expect(screen.getByText(/Role: owner/)).toBeInTheDocument();
    expect(screen.getByText(/Nickname: Colt/)).toBeInTheDocument();
    expect(screen.getByText(/Server: Test Server/)).toBeInTheDocument();
  });
});
