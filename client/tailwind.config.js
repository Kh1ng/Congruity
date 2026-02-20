/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
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
    },
  },
  plugins: [],
};
