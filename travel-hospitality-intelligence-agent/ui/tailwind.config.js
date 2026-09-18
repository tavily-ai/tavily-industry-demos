/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        gray: { 50: '#f7f7f5', 100: '#f2eee6', 200: '#e6e0d7', 300: '#d3ccc1', 400: '#a29c94', 500: '#7a756f', 600: '#6b6762', 700: '#55514c', 800: '#45413c', 900: '#3c3a39' }
      }
    },
  },
  plugins: [],
};
