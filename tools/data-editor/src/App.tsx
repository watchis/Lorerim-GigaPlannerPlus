import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileJson, Folder, FolderOpen, RefreshCw } from "lucide-react";
import type { DataFileNode } from "./types";
import { fetchFile, fetchFileTree } from "./api";
import { JsonEditor } from "./components/JsonEditor";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: DataFileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "file") {
    const selected = node.path === selectedPath;
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          "group relative flex w-full items-center gap-2 rounded-[var(--radius-sm)] py-1.5 pr-2 text-left text-xs transition-colors duration-150",
          selected
            ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
            : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]",
        )}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
      >
        {selected && (
          <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--color-accent)]" />
        )}
        <FileJson
          className={cn(
            "size-3.5 shrink-0 transition-colors",
            selected ? "text-[var(--color-accent)]" : "opacity-60 group-hover:opacity-90",
          )}
        />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1 rounded-[var(--radius-sm)] py-1 pr-2 text-left text-xs text-[var(--color-foreground)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)]"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <ChevronRight
          className={cn("size-3 shrink-0 text-[var(--color-muted)] transition-transform duration-150", open && "rotate-90")}
        />
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-[var(--color-accent-muted)]" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-[var(--color-accent-muted)]" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open &&
        node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function App() {
  const [tree, setTree] = useState<DataFileNode[]>([]);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const isDirty = useMemo(
    () => selectedPath !== null && fileContent !== savedContent,
    [selectedPath, fileContent, savedContent],
  );

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    setTreeError(null);
    try {
      setTree(await fetchFileTree());
    } catch (error) {
      setTreeError(String(error));
    } finally {
      setLoadingTree(false);
    }
  }, []);

  const loadFile = useCallback(async (path: string) => {
    setLoadingFile(true);
    setLoadError(null);
    try {
      const content = await fetchFile(path);
      setFileContent(content);
      setSavedContent(content);
    } catch (error) {
      setLoadError(String(error));
      setFileContent("");
      setSavedContent("");
    } finally {
      setLoadingFile(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const handleSelect = useCallback(
    async (path: string) => {
      if (path === selectedPath) return;
      if (isDirty && !window.confirm("Discard unsaved changes?")) return;
      setSelectedPath(path);
      setLoadingFile(true);
      await loadFile(path);
    },
    [selectedPath, isDirty, loadFile],
  );

  const handleSaved = useCallback((content: string) => {
    setFileContent(content);
    setSavedContent(content);
  }, []);

  return (
    <div className="app-shell flex h-screen flex-col text-[var(--color-foreground)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 px-5 py-3.5 backdrop-blur-sm">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-wide text-[var(--color-accent)]">
            GigaPlanner Data Editor
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">Local dev tool — edits files under <code className="rounded bg-[var(--color-surface-elevated)] px-1 py-px font-mono text-[10px] text-[var(--color-foreground)]">data/</code></p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadTree()} disabled={loadingTree}>
          <RefreshCw className={cn("size-3.5", loadingTree && "animate-spin")} />
          Refresh tree
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="border-b border-[var(--color-border-subtle)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Files</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {treeError && (
              <p className="mb-2 rounded-[var(--radius-sm)] bg-[var(--color-error)]/10 px-2.5 py-1.5 text-xs text-[var(--color-error-muted)]">
                {treeError}
              </p>
            )}
            {loadingTree && !tree.length && (
              <p className="px-2 py-2 text-xs text-[var(--color-muted)]">Loading files…</p>
            )}
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={(path) => void handleSelect(path)}
              />
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-background)]/50">
          {!selectedPath ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
                <FileJson className="size-6 text-[var(--color-accent-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">No file selected</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">Choose a JSON file from the sidebar to edit</p>
              </div>
            </div>
          ) : (
            <JsonEditor
              key={selectedPath}
              path={selectedPath}
              content={fileContent}
              savedContent={savedContent}
              isDirty={isDirty}
              loading={loadingFile}
              loadError={loadError}
              onContentChange={setFileContent}
              onSaved={handleSaved}
            />
          )}
        </main>
      </div>
    </div>
  );
}
