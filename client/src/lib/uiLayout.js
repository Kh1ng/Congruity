export const UI_PREFS_STORAGE_KEY = "congruity_ui_prefs";

export const DEFAULT_UI_PREFS = {
  panelOpacity: 0.92,
  appBackgroundOpacity: 1,
  density: "normal",
  widths: {
    serverDock: 280,
    memberPanel: 300,
  },
};

export const SCREENSHOT_VIEWPORTS = [
  { name: "iphone", width: 390, height: 844 },
  { name: "iphone-large", width: 430, height: 932 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "laptop-small", width: 1280, height: 800 },
  { name: "laptop", width: 1440, height: 900 },
  { name: "desktop", width: 1920, height: 1080 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeUiPrefs(input) {
  const next = {
    ...DEFAULT_UI_PREFS,
    ...(input || {}),
    widths: {
      ...DEFAULT_UI_PREFS.widths,
      ...(input?.widths || {}),
    },
  };

  next.panelOpacity = clamp(Number(next.panelOpacity) || DEFAULT_UI_PREFS.panelOpacity, 0.55, 1);
  next.appBackgroundOpacity = clamp(
    Number(next.appBackgroundOpacity) || DEFAULT_UI_PREFS.appBackgroundOpacity,
    0.65,
    1,
  );
  next.widths.serverDock = clamp(Number(next.widths.serverDock) || DEFAULT_UI_PREFS.widths.serverDock, 220, 420);
  next.widths.memberPanel = clamp(Number(next.widths.memberPanel) || DEFAULT_UI_PREFS.widths.memberPanel, 220, 420);
  next.density = next.density === "compact" ? "compact" : "normal";

  return next;
}

export function loadUiPrefs() {
  if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") {
    return DEFAULT_UI_PREFS;
  }
  try {
    return normalizeUiPrefs(JSON.parse(localStorage.getItem(UI_PREFS_STORAGE_KEY) || "null"));
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function saveUiPrefs(value) {
  if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") return;
  localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(normalizeUiPrefs(value)));
}

export function resolveResponsiveLayout(width) {
  const safeWidth = Number(width) || 1440;
  const state = {
    breakpoint: "desktop",
    mobileStack: false,
    collapseMembers: false,
    collapseChannels: false,
    serverDockMax: 320,
    memberDockMax: 300,
  };

  if (safeWidth < 700) {
    return {
      ...state,
      breakpoint: "mobile",
      mobileStack: true,
      collapseMembers: true,
      collapseChannels: true,
      serverDockMax: 240,
      memberDockMax: 0,
    };
  }
  if (safeWidth < 900) {
    return {
      ...state,
      breakpoint: "narrow",
      collapseMembers: true,
      serverDockMax: 250,
      memberDockMax: 0,
    };
  }
  if (safeWidth < 1200) {
    return {
      ...state,
      breakpoint: "tablet",
      collapseMembers: true,
      serverDockMax: 260,
      memberDockMax: 0,
    };
  }
  if (safeWidth < 1600) {
    return {
      ...state,
      breakpoint: "laptop",
      collapseMembers: false,
      serverDockMax: 280,
      memberDockMax: 250,
    };
  }

  return {
    ...state,
    breakpoint: "desktop-wide",
    serverDockMax: 320,
    memberDockMax: 300,
  };
}

