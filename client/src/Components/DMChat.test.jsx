import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DMChat from "./DMChat";

const sendMessageMock = vi.fn();

vi.mock("@/hooks", () => ({
  useDirectMessages: () => ({
    messages: [
      {
        id: "m1",
        content: "Yo",
        user_id: "u1",
        profiles: { display_name: "Alice" },
      },
    ],
    loading: false,
    error: null,
    sendMessage: sendMessageMock,
  }),
}));

describe("DMChat", () => {
  it("renders empty state when no friend", () => {
    render(<DMChat friend={null} />);
    expect(screen.getByText(/select a friend/i)).toBeInTheDocument();
  });

  it("send DM", async () => {
    render(<DMChat friend={{ id: "f1", username: "alice" }} />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/type a dm/i), {
        target: { value: "hello" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    expect(sendMessageMock).toHaveBeenCalledWith("hello");
  });
});
