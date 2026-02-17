import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "themePreset";
const DEFAULT_THEME = "gruvbox";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "gruvbox", label: "Gruvbox" },
  { value: "tokyo-night", label: "Tokyo Night" },
];

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  options: THEME_OPTIONS,
});

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_OPTIONS.some((opt) => opt.value === stored)) {
      setThemeState(stored);
      applyTheme(stored);
      return;
    }
    applyTheme(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      options: THEME_OPTIONS,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
