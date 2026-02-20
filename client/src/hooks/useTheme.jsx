import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "themePreset";
const THEME_CUSTOM_STORAGE_KEY = "themeCustomPalette";
const DEFAULT_THEME = "gruvbox";
const CUSTOM_THEME = "custom";
const THEME_VARIABLE_KEYS = [
  "bg",
  "surface",
  "surface-alt",
  "text",
  "text-muted",
  "border",
  "accent",
  "accent-contrast",
  "accent-2",
  "danger",
  "success",
];
const DEFAULT_CUSTOM_THEME = {
  bg: "#1e1e1e",
  surface: "#252526",
  "surface-alt": "#2d2d30",
  text: "#d4d4d4",
  "text-muted": "#9da2a6",
  border: "#3e3e42",
  accent: "#569cd6",
  "accent-contrast": "#ffffff",
  "accent-2": "#c586c0",
  danger: "#f44747",
  success: "#4ec9b0",
};

const THEME_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "gruvbox", label: "Gruvbox" },
  { value: "tokyo-night", label: "Tokyo Night" },
  { value: "monokai", label: "Monokai" },
  { value: CUSTOM_THEME, label: "Custom" },
];

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  customPalette: DEFAULT_CUSTOM_THEME,
  setCustomColor: () => {},
  resetCustomPalette: () => {},
  options: THEME_OPTIONS,
});

const removeCustomOverrides = (root) => {
  THEME_VARIABLE_KEYS.forEach((key) => {
    root.style.removeProperty(`--color-${key}`);
  });
};

const normalizeCustomPalette = (value) => {
  if (!value || typeof value !== "object") return DEFAULT_CUSTOM_THEME;
  return THEME_VARIABLE_KEYS.reduce((acc, key) => {
    const nextValue = value[key];
    acc[key] = typeof nextValue === "string" && nextValue.trim() ? nextValue : DEFAULT_CUSTOM_THEME[key];
    return acc;
  }, {});
};

const applyTheme = (theme, customPalette) => {
  const root = document.documentElement;
  root.dataset.theme = theme;

  if (theme === CUSTOM_THEME) {
    const palette = normalizeCustomPalette(customPalette);
    THEME_VARIABLE_KEYS.forEach((key) => {
      root.style.setProperty(`--color-${key}`, palette[key]);
    });
    return;
  }

  removeCustomOverrides(root);
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [customPalette, setCustomPalette] = useState(DEFAULT_CUSTOM_THEME);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const storedCustom = localStorage.getItem(THEME_CUSTOM_STORAGE_KEY);
    let parsedCustom = DEFAULT_CUSTOM_THEME;

    if (storedCustom) {
      try {
        parsedCustom = normalizeCustomPalette(JSON.parse(storedCustom));
      } catch {
        parsedCustom = DEFAULT_CUSTOM_THEME;
      }
    }

    setCustomPalette(parsedCustom);
    if (storedTheme && THEME_OPTIONS.some((opt) => opt.value === storedTheme)) {
      setThemeState(storedTheme);
      applyTheme(storedTheme, parsedCustom);
      return;
    }

    applyTheme(DEFAULT_THEME, parsedCustom);
  }, []);

  useEffect(() => {
    applyTheme(theme, customPalette);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_CUSTOM_STORAGE_KEY, JSON.stringify(customPalette));
  }, [theme, customPalette]);

  const setCustomColor = (key, value) => {
    if (!THEME_VARIABLE_KEYS.includes(key)) return;
    setCustomPalette((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetCustomPalette = () => {
    setCustomPalette(DEFAULT_CUSTOM_THEME);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      customPalette,
      setCustomColor,
      resetCustomPalette,
      options: THEME_OPTIONS,
    }),
    [theme, customPalette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
