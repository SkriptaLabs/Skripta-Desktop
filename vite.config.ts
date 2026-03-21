import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasm()],

  // Tauri: verhindere, dass Vite das Terminal überschreibt
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tauri-Backend-Änderungen nicht durch Vite watchen
      ignored: ["**/src-tauri/**", "**/packages/server/**"],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
