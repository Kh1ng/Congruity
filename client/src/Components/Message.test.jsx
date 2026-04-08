import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Messages from "./Message";

const sendMessageMock = vi.fn();

vi.mock("@/hooks", () => ({
  useMessages: () => ({
    messages: [
      {
        id: "m1",
        content: "Hello",
        user_id: "u1",
        profiles: { display_name: "Colt" },
      },
    ],
    loading: false,
    error: null,
    sendMessage: sendMessageMock,
  }),
}));

describe("Messages", () => {
  it("renders messages", () => {
    render(<Messages channelId="c1" />);
    expect(screen.getByText(/colt/i)).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("send message", async () => {
    render(<Messages channelId="c1" />);
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/message #channel/i), {
        target: { value: "Yo" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });
    expect(sendMessageMock).toHaveBeenCalledWith("Yo");
  });
});
