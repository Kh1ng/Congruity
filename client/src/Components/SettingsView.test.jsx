import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SettingsView from "./SettingsView";

const setThemeMock = vi.fn();
const leaveServerMock = vi.fn();
const deleteServerMock = vi.fn();

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "gruvbox",
    setTheme: setThemeMock,
    options: [
      { value: "gruvbox", label: "Gruvbox" },
      { value: "tokyo-night", label: "Tokyo Night" },
      { value: "custom", label: "Custom" },
    ],
    customPalette: {
      bg: "#1e1e1e",
      surface: "#252526",
      "surface-alt": "#2d2d30",
      text: "#d4d4d4",
      "text-muted": "#9da2a6",
      border: "#3e3e42",
      accent: "#569cd6",
      "accent-2": "#c586c0",
    },
    setCustomColor: vi.fn(),
    resetCustomPalette: vi.fn(),
  }),
}));

vi.mock("@/hooks", () => ({
  useServers: () => ({
    leaveServer: leaveServerMock,
    deleteServer: deleteServerMock,
  }),
}));

vi.mock("./AccountSettings", () => ({
  default: ({ serverId, showAppearanceSection }) => (
    <div data-testid="account-settings">
      account:{String(serverId)}:{String(showAppearanceSection)}
    </div>
  ),
}));

describe("SettingsView", () => {
  const confirmSpy = vi.spyOn(window, "confirm");

  beforeEach(() => {
    leaveServerMock.mockReset();
    deleteServerMock.mockReset();
    confirmSpy.mockReset();
    confirmSpy.mockReturnValue(true);
  });

  it("splits settings into application/account/server tabs", () => {
    render(
      <SettingsView
        server={{ id: "s1", name: "Alpha", hosting_type: "self_hosted" }}
        serverId="s1"
        voice={{ videoConstraints: { width: 1280, height: 720, frameRate: 30 } }}
        uiPrefs={{ panelOpacity: 0.92, appBackgroundOpacity: 1, density: "normal", widths: { serverDock: 280, memberPanel: 300 } }}
        onUiPrefsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Application" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.getByTestId("account-settings")).toHaveTextContent("account:s1:false");

    fireEvent.click(screen.getByRole("tab", { name: "Server" }));
    expect(screen.getByText(/server roles \(alpha\)/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alpha")).toBeInTheDocument();
  });

  it("updates ui preference sliders via callback", () => {
    const onUiPrefsChange = vi.fn();
    render(
      <SettingsView
        server={null}
        serverId={null}
        voice={{}}
        uiPrefs={{ panelOpacity: 0.9, appBackgroundOpacity: 0.95, density: "compact", widths: { serverDock: 260, memberPanel: 240 } }}
        onUiPrefsChange={onUiPrefsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Panel opacity"), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText("Left dock width"), {
      target: { value: "320" },
    });
    fireEvent.change(screen.getByLabelText("Density"), {
      target: { value: "normal" },
    });

    expect(onUiPrefsChange).toHaveBeenCalled();
    const updater = onUiPrefsChange.mock.calls[0][0];
    expect(
      updater({
        panelOpacity: 0.9,
        appBackgroundOpacity: 0.95,
        density: "compact",
        widths: { serverDock: 260, memberPanel: 240 },
      }),
    ).toMatchObject({
      panelOpacity: 0.8,
      widths: { serverDock: 260, memberPanel: 240 },
    });
  });

  it("shows leave server action in server settings for non-owner members", async () => {
    const onServerRemoved = vi.fn();
    render(
      <SettingsView
        server={{ id: "s2", name: "Beta", hosting_type: "self_hosted", server_members: [{ role: "member" }] }}
        serverId="s2"
        voice={{}}
        uiPrefs={{ panelOpacity: 0.9, appBackgroundOpacity: 1, density: "normal", widths: { serverDock: 280, memberPanel: 300 } }}
        onUiPrefsChange={vi.fn()}
        onServerRemoved={onServerRemoved}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Server" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave Server" }));
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(leaveServerMock).toHaveBeenCalledWith("s2");
    expect(deleteServerMock).not.toHaveBeenCalled();
    expect(onServerRemoved).toHaveBeenCalled();
  });
});
