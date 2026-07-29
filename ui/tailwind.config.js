/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#f8f8fa",
          900: "#f1f1f5",
          850: "#e8e8ee",
          800: "#dddde6",
          700: "#c8c8d4",
          600: "#a0a0b4",
          500: "#7a7a92",
          400: "#5c5c72",
          300: "#44445a",
          200: "#2e2e42",
          100: "#1a1a2e",
        },
        accent: {
          300: "#b5b3ff",
          400: "#9c9aff",
          500: "#817FFF",
          600: "#5a58c9",
        },
        tavily: {
          black: "#1F1E1E",
          offwhite: "#FFFCF6",
          green: "#80AF9B",
          blue: "#79DEEB",
          lavender: "#817FFF",
          orange: "#FF7300",
          yellow: "#FFC753",
          pink: "#F49EFF",
        },
        risk: {
          low: "#16a364",
          moderate: "#3b82f6",
          elevated: "#d97706",
          high: "#dc2626",
          critical: "#b91c1c",
        },
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
