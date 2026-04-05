import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        workspace: resolve(__dirname, "workspace.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
        "page-bridge": resolve(__dirname, "src/content/page/pageBridge.ts")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") {
            return "background.js";
          }

          if (chunkInfo.name === "content") {
            return "content.js";
          }

          if (chunkInfo.name === "page-bridge") {
            return "page-bridge.js";
          }

          return "assets/[name]-[hash].js";
        },
        manualChunks: (id) => {
          if (id.includes("pdfjs-dist")) {
            return "pdf";
          }

          if (id.includes("maplibre-gl")) {
            return "maplibre";
          }

          if (id.includes("react-grid-layout") || id.includes("react-resizable")) {
            return "layout";
          }

          if (id.includes("zustand")) {
            return "state";
          }

          return undefined;
        }
      }
    }
  }
});
