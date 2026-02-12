import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FriendsList from "./FriendsList";

const addFriendMock = vi.fn();

vi.mock("@/hooks", () => ({
  useFriends: () => ({
    friends: [
      { id: "f1", username: "alice", display_name: "Alice" },
      { id: "f2", username: "bob", display_name: "Bob" },
    ],
    pending: [],
    loading: false,
    error: null,
    addFriendByUsername: addFriendMock,
  }),
}));

describe("FriendsList", () => {
  it("renders friends and message button", () => {
    const onMessage = vi.fn();
    render(<FriendsList onMessage={onMessage} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText(/message/i)[0]);
    expect(onMessage).toHaveBeenCalled();
  });

  it("add friend", async () => {
    render(<FriendsList />);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/add friend by username/i), {
        target: { value: "charlie" },
      });
      fireEvent.click(screen.getByRole("button", { name: /add/i }));
    });

    expect(addFriendMock).toHaveBeenCalledWith("charlie");
  });
});
