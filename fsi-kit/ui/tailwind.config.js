/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#fefcf5",
          900: "#f5f1ea",
          850: "#ede6db",
          800: "#e8e3d8",
          700: "#d4cfc6",
          600: "#b3afa8",
          500: "#8a8780",
          400: "#73716b",
          300: "#5c5a56",
          200: "#4a4846",
          100: "#3c3a39",
        },
        accent: {
          300: "#8fbcfa",
          400: "#5a9bff",
          500: "#2677ff",
          600: "#1d5fd6",
        },
        tavily: {
          black: "#3c3a39",
          offwhite: "#fefcf5",
          green: "#2677ff",
          blue: "#2677ff",
          lavender: "#8fbcfa",
          orange: "#ff7300",
          yellow: "#ffc753",
          pink: "#f49eff",
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
        display: ['"Suisse Intl"', "Suisse International", "system-ui", "sans-serif"],
        body: ['"Suisse Intl"', "Suisse International", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
