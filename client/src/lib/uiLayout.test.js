import { describe, it, expect } from "vitest";
import {
  DEFAULT_UI_PREFS,
  SCREENSHOT_VIEWPORTS,
  normalizeUiPrefs,
  resolveResponsiveLayout,
} from "./uiLayout";

describe("uiLayout", () => {
  it("normalizes ui preferences with clamped values", () => {
    const prefs = normalizeUiPrefs({
      panelOpacity: 10,
      appBackgroundOpacity: 0.1,
      density: "weird",
      widths: { serverDock: 999, memberPanel: 10 },
    });

    expect(prefs).toEqual({
      ...DEFAULT_UI_PREFS,
      panelOpacity: 1,
      appBackgroundOpacity: 0.65,
      density: "normal",
      widths: {
        serverDock: 420,
        memberPanel: 220,
      },
    });
  });

  it("resolves responsive breakpoints and collapse rules", () => {
    expect(resolveResponsiveLayout(1920)).toMatchObject({
      breakpoint: "desktop-wide",
      collapseMembers: false,
      collapseChannels: false,
    });
    expect(resolveResponsiveLayout(1100)).toMatchObject({
      breakpoint: "tablet",
      collapseMembers: true,
    });
    expect(resolveResponsiveLayout(850)).toMatchObject({
      breakpoint: "narrow",
      collapseMembers: true,
    });
    expect(resolveResponsiveLayout(640)).toMatchObject({
      breakpoint: "mobile",
      mobileStack: true,
      collapseChannels: true,
    });
  });

  it("defines a screenshot viewport matrix for responsive review", () => {
    expect(SCREENSHOT_VIEWPORTS.map((v) => v.width)).toEqual([
      390, 430, 768, 1024, 1280, 1440, 1920,
    ]);
    expect(SCREENSHOT_VIEWPORTS.every((v) => v.height > 0)).toBe(true);
  });
});

