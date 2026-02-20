import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("renders initials when no image is provided", () => {
    render(<Avatar name="John Doe" />);

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("uses first two characters for single word names", () => {
    render(<Avatar name="Khing" />);

    expect(screen.getByText("KH")).toBeInTheDocument();
  });

  it("handles empty name gracefully", () => {
    render(<Avatar name="" />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders image when src is provided", () => {
    render(<Avatar name="John Doe" src="https://example.com/avatar.jpg" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "John Doe");
  });

  it("falls back to initials on image error", async () => {
    render(<Avatar name="John Doe" src="https://example.com/broken.jpg" />);

    const img = screen.getByRole("img");
    
    // Fire error event wrapped in act
    await act(async () => {
      fireEvent.error(img);
    });

    // After error, should show initials
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies size variants", () => {
    const { rerender } = render(<Avatar name="Test" size="sm" />);
    expect(screen.getByTestId("avatar")).toHaveClass("h-6", "w-6");

    rerender(<Avatar name="Test" size="md" />);
    expect(screen.getByTestId("avatar")).toHaveClass("h-8", "w-8");

    rerender(<Avatar name="Test" size="lg" />);
    expect(screen.getByTestId("avatar")).toHaveClass("h-10", "w-10");

    rerender(<Avatar name="Test" size="xl" />);
    expect(screen.getByTestId("avatar")).toHaveClass("h-12", "w-12");
  });

  it("shows online status indicator when specified", () => {
    render(<Avatar name="Test" status="online" />);

    expect(screen.getByTestId("status-indicator")).toHaveClass("bg-green-500");
  });

  it("shows offline status indicator when specified", () => {
    render(<Avatar name="Test" status="offline" />);

    expect(screen.getByTestId("status-indicator")).toHaveClass("bg-gray-500");
  });

  it("hides status indicator when not specified", () => {
    render(<Avatar name="Test" />);

    expect(screen.queryByTestId("status-indicator")).not.toBeInTheDocument();
  });
});
