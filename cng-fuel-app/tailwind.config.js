/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#E30613", light: "#FF1A26", dark: "#B0000A" },
        accent: { DEFAULT: "#CC0511", light: "#E30613", dark: "#99000D" },
        brand: { bg: "#F7F4EC" },
      },
    },
  },
  plugins: [],
};
