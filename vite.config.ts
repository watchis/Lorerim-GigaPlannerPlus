import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const base = "/Lorerim-GigaPlannerPlus/";

function basePathRedirect(): Plugin {
  const baseNoSlash = base.replace(/\/$/, "");
  return {
    name: "base-path-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url === baseNoSlash || url.startsWith(`${baseNoSlash}?`)) {
          const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
          res.writeHead(301, { Location: `${base}${query}` });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), basePathRedirect()],
  base,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});