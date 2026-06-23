import type { DataFileNode } from "./types";

const API = "/__data-editor/api";

export async function fetchFileTree(): Promise<DataFileNode[]> {
  const res = await fetch(`${API}/tree`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load file tree (${res.status})`);
  }
  const data = (await res.json()) as { tree: DataFileNode[] };
  return data.tree;
}

export async function fetchFile(path: string): Promise<string> {
  const res = await fetch(`${API}/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load file (${res.status})`);
  }
  const data = (await res.json()) as { content: string };
  return data.content;
}

export async function saveFile(path: string, content: string): Promise<string> {
  const res = await fetch(`${API}/file?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: content,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to save file (${res.status})`);
  }
  const data = (await res.json()) as { content: string };
  return data.content;
}
