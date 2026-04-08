import React from "react";
import { useTheme } from "@/hooks/useTheme";

function ThemeSelector() {
  const { theme, setTheme, options } = useTheme();

  return (
    <div className="pt-4">
      <label
        htmlFor="theme-select"
        className="block text-sm font-semibold text-[color:var(--color-text-muted)] mb-2"
      >
        Theme
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded px-3 py-2 text-[color:var(--color-text)] text-sm focus:outline-none focus:border-[color:var(--color-accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ThemeSelector;
