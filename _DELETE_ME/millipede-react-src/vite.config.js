import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",          // <-- explicitly say project root
  base: "./",         // <-- REQUIRED for PIXEL-NET subfolder hosting
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
