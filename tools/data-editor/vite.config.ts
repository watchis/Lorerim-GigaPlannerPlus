import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { dataEditorApiPlugin } from "./vite-plugin";

const editorRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(editorRoot, "../..");

export default defineConfig({
  root: editorRoot,
  publicDir: path.resolve(repoRoot, "public"),
  plugins: [react(), tailwindcss(), dataEditorApiPlugin(path.resolve(repoRoot, "data"))],
  resolve: {
    alias: {
      "@": path.resolve(editorRoot, "./src"),
    },
  },
  server: {
    port: 5174,
    open: "/",
    fs: {
      allow: [repoRoot],
    },
  },
});
