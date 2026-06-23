import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const API_PREFIX = "/__data-editor/api";

interface DataFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: DataFileNode[];
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function buildFileTree(dir: string, relativeRoot: string): Promise<DataFileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: DataFileNode[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.posix.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: await buildFileTree(path.join(dir, entry.name), relativePath),
      });
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      });
    }
  }

  return nodes;
}

export function dataEditorApiPlugin(dataRoot: string): Plugin {
  const resolvedRoot = path.resolve(dataRoot);

  function resolveSafePath(relativePath: string): string | null {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const resolved = path.resolve(resolvedRoot, normalized);
    if (!resolved.startsWith(resolvedRoot)) return null;
    if (!resolved.endsWith(".json")) return null;
    return resolved;
  }

  return {
    name: "data-editor-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(API_PREFIX)) {
          next();
          return;
        }

        try {
          const route = new URL(url, "http://localhost");
          const pathname = route.pathname;

          if (req.method === "GET" && pathname === `${API_PREFIX}/tree`) {
            const tree = await buildFileTree(resolvedRoot, "");
            sendJson(res, 200, { tree });
            return;
          }

          if (pathname === `${API_PREFIX}/file`) {
            const filePath = route.searchParams.get("path");
            if (!filePath) {
              sendJson(res, 400, { error: "Missing path query parameter" });
              return;
            }

            const absolutePath = resolveSafePath(filePath);
            if (!absolutePath) {
              sendJson(res, 400, { error: "Invalid file path" });
              return;
            }

            if (req.method === "GET") {
              const content = await fs.readFile(absolutePath, "utf8");
              sendJson(res, 200, { path: filePath, content });
              return;
            }

            if (req.method === "PUT") {
              const body = await readBody(req);
              let parsed: unknown;
              try {
                parsed = JSON.parse(body);
              } catch {
                sendJson(res, 400, { error: "Invalid JSON" });
                return;
              }

              const formatted = `${JSON.stringify(parsed, null, 2)}\n`;
              await fs.writeFile(absolutePath, formatted, "utf8");
              sendJson(res, 200, { path: filePath, content: formatted });
              return;
            }
          }

          sendJson(res, 404, { error: "Not found" });
        } catch (error) {
          sendJson(res, 500, { error: String(error) });
        }
      });
    },
  };
}
