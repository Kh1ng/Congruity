/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        theme: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          text: "var(--color-text)",
          "text-muted": "var(--color-text-muted)",
          border: "var(--color-border)",
          accent: "var(--color-accent)",
          "accent-contrast": "var(--color-accent-contrast)",
          "accent-2": "var(--color-accent-2)",
          danger: "var(--color-danger)",
          success: "var(--color-success)",
        },
        // Keep gruvbox for backwards compatibility
        gruvbox: {
          dark: "#282828",
          light: "#32302f",
          fgLight: "#ebdbb2",
          fgDark: "#d5c4a1",
          red: "#fb4934",
          green: "#b8bb26",
          yellow: "#fabd2f",
          blue: "#83a598",
          purple: "#d3869b",
          aqua: "#8ec07c",
          orange: "#fe8019",
          border: "#665c54",
        },
      },
      backgroundColor: {
        theme: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
        },
      },
      textColor: {
        theme: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          accent: "var(--color-accent)",
        },
      },
      borderColor: {
        theme: {
          DEFAULT: "var(--color-border)",
          accent: "var(--color-accent)",
        },
      },
    },
  },
  plugins: [],
};
