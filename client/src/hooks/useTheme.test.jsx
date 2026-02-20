import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./useTheme";

describe("useTheme", () => {
  const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
      localStorageMock.store[key] = value;
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {};
    }),
  };

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    localStorageMock.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

  it("provides default theme (gruvbox)", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("gruvbox");
  });

  it("provides theme options", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.options).toHaveLength(6);
    expect(result.current.options.map((o) => o.value)).toEqual([
      "dark",
      "light",
      "gruvbox",
      "tokyo-night",
      "monokai",
      "custom",
    ]);
  });

  it("allows changing theme", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
  });

  it("applies theme to document element", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("tokyo-night");
    });

    expect(document.documentElement.dataset.theme).toBe("tokyo-night");
  });

  it("persists theme to localStorage", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("light");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("themePreset", "light");
  });

  it("loads theme from localStorage on mount", () => {
    localStorageMock.store.themePreset = "dark";

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
  });

  it("ignores invalid theme from localStorage", () => {
    localStorageMock.store.themePreset = "invalid-theme";

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("gruvbox");
  });

  it("updates custom palette colors and persists custom theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("custom");
      result.current.setCustomColor("accent", "#ff0000");
    });

    expect(result.current.theme).toBe("custom");
    expect(result.current.customPalette.accent).toBe("#ff0000");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#ff0000");
  });
});
