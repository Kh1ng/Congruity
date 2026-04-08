import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "./Login";

const signInMock = vi.fn();
const signUpMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: signInMock,
    signUp: signUpMock,
  }),
}));

describe("Login", () => {
  it("toggle: switches between login and sign up", async () => {
    render(<Login />);

    // Login mode by default
    expect(screen.queryByPlaceholderText("Username")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /need an account/i }));
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    expect(screen.queryByPlaceholderText("Username")).toBeNull();
  });

  it("login flow", async () => {
    signInMock.mockResolvedValueOnce();

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("sign-up flow", async () => {
    signUpMock.mockResolvedValueOnce();

    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /need an account/i }));

    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "colt" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith("new@example.com", "password123", {
        username: "colt",
      });
    });
  });
});
