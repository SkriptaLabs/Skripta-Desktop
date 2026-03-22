import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [solid(), tailwindcss(), wasm()],

  // Tauri: verhindere, dass Vite das Terminal überschreibt
  clearScreen: false,

  build: {
    target: "esnext",
  },

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
