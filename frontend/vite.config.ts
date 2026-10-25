import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const DARK = "#121212";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app (section 2) that opens without internet (section 12)
    VitePWA({
      registerType: "autoUpdate", // a new version replaces the old one by itself
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Sync.",
        short_name: "Sync",
        description: "Tarefas, treinos, lista de compras e finanças num lugar só.",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        theme_color: DARK,
        background_color: DARK,
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The screens are cached; any page opens offline through index.html
        navigateFallback: "/index.html",
        // The API is never cached here: offline data is handled by the app itself
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
  },
  server: {
    // In development, requests to /api go to the Python backend
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
