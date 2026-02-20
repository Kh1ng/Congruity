import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeSelector from "./ThemeSelector";
import { ThemeProvider } from "@/hooks/useTheme";

// Mock localStorage
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

const renderWithTheme = (ui) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe("ThemeSelector", () => {
  it("renders theme selector with all options", () => {
    renderWithTheme(<ThemeSelector />);

    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Should have all 4 theme options
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(4);
  });

  it("shows current theme as selected", () => {
    localStorageMock.store.themePreset = "tokyo-night";
    renderWithTheme(<ThemeSelector />);

    const select = screen.getByRole("combobox");
    expect(select.value).toBe("tokyo-night");
  });

  it("changes theme when selecting a new option", () => {
    renderWithTheme(<ThemeSelector />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "light" } });

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("displays theme option labels correctly", () => {
    renderWithTheme(<ThemeSelector />);

    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Gruvbox")).toBeInTheDocument();
    expect(screen.getByText("Tokyo Night")).toBeInTheDocument();
  });
});
