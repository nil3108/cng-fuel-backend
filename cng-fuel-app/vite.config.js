import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.jpg"],
      manifest: {
        name: "CNG Fuel Credit Service",
        short_name: "CNG Fuel",
        description: "CNG fuel fill tracking and credit management",
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/logo.jpg", sizes: "192x192", type: "image/jpeg" },
          { src: "/logo.jpg", sizes: "512x512", type: "image/jpeg" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg}"],
      },
    }),
  ],
  server: {
    allowedHosts: [".ngrok-free.app"],
  },
});
