/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FFFFFF", light: "#F5F5F5", dark: "#E5E7EB" },
        accent: { DEFAULT: "#DC2626", light: "#EF4444", dark: "#B91C1C" },
        brand: { bg: "#FFFFFF", card: "#F8F8F8", surface: "#F0F0F0" },
        mint: { DEFAULT: "#2EF2B1", light: "#5FF5C4" },
        silver: { DEFAULT: "#6B7280", dark: "#4B5563" },
        ink: { DEFAULT: "#0B0B0B", light: "#1A1A1A" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0,0,0,0.08)',
        'glow': '0 0 20px rgba(220,38,38,0.15)',
        'glow-mint': '0 0 20px rgba(46,242,177,0.1)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
};
