import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  base: "./",
  root: ".",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_NAME__: JSON.stringify(pkg.productName || "Squeezr"),
  },
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    target: "chrome120",
  },
});
