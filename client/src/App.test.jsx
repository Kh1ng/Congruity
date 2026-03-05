import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockAuthState = {};

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("./lib/serverConfig", () => ({
  ConfigManager: {
    needsConfiguration: vi.fn(() => false),
  },
}));

vi.mock("./Components/Login", () => ({
  default: () => <div>Login Form</div>,
}));

vi.mock("./Components/Home", () => ({
  default: () => <div>Home Shell</div>,
}));

vi.mock("./Components/ConfigWizard", () => ({
  ConfigWizard: ({ onComplete }) => (
    <div>
      Config Wizard
      <button type="button" onClick={onComplete}>
        Done
      </button>
    </div>
  ),
}));

import App from "./App";

describe("App auth resilience", () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      loading: false,
      authError: null,
      retrySession: vi.fn(),
      signOut: vi.fn(),
    };
  });

  it("shows a helpful backend-unavailable state instead of crashing", () => {
    mockAuthState.authError = new Error("Load failed");
    render(<App />);

    expect(screen.getByText("Connection unavailable")).toBeInTheDocument();
    expect(screen.getByText(/could not reach your auth backend/i)).toBeInTheDocument();
    expect(screen.getByText(/load failed/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue in guest mode/i })
    ).toBeInTheDocument();
  });

  it("allows continuing in guest mode", () => {
    mockAuthState.authError = new Error("Load failed");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /continue in guest mode/i }));

    expect(screen.getByText(/guest mode/i)).toBeInTheDocument();
    expect(screen.getByText("Home Shell")).toBeInTheDocument();
  });
});
