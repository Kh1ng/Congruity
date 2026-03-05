import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function BrokenRender() {
  throw new Error("Render exploded");
}

describe("ErrorBoundary", () => {
  it("renders children when no errors happen", () => {
    render(
      <ErrorBoundary>
        <div>Healthy view</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Healthy view")).toBeInTheDocument();
  });

  it("shows fallback UI when child throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenRender />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/render exploded/i)).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("resets fallback with Try again", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function SometimesBroken() {
      const [crash, setCrash] = React.useState(true);
      if (crash) {
        throw new Error("Temporary crash");
      }
      return <button onClick={() => setCrash(true)}>Crash again</button>;
    }

    render(
      <ErrorBoundary>
        <SometimesBroken />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("ignores abort-like unhandled rejections", () => {
    render(
      <ErrorBoundary>
        <div>Healthy view</div>
      </ErrorBoundary>
    );

    const event = new Event("unhandledrejection");
    event.reason = new Error("AbortError: The operation was aborted.");
    window.dispatchEvent(event);

    expect(screen.getByText("Healthy view")).toBeInTheDocument();
  });
});
