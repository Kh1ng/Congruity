import React from "react";
import { render, screen } from "@testing-library/react";
import MembersPanel from "./MembersPanel";

jest.mock("@/hooks", () => ({
  useServerMembers: jest.fn(),
}));

const { useServerMembers } = require("@/hooks");

describe("MembersPanel", () => {
  it("renders a prompt when no server selected", () => {
    useServerMembers.mockReturnValue({ members: [], loading: false, error: null });
    render(<MembersPanel serverId={null} />);
    expect(screen.getByText(/select a server/i)).toBeInTheDocument();
  });

  it("renders members list", () => {
    useServerMembers.mockReturnValue({
      members: [
        {
          user_id: "user-1",
          nickname: "Nova",
          profiles: { username: "nova", display_name: "Nova", status: "online" },
        },
      ],
      loading: false,
      error: null,
    });

    render(<MembersPanel serverId="server-1" />);
    expect(screen.getByText("Nova")).toBeInTheDocument();
  });
});
