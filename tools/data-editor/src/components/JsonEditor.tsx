import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Code, ListTree, Move, RotateCcw, Save, Search, X } from "lucide-react";
import { saveFile } from "../api";
import { EditorFileProvider } from "./EditorFileContext";
import { JsonNode } from "./JsonNode";
import { JsonRawEditor } from "./JsonRawEditor";
import { PerkTreeLayoutEditor } from "./PerkTreeLayoutEditor";
import { TreeSearchProvider } from "./TreeSearchContext";
import { panelCardClass, fieldInputClass, modeToggleActiveClass, modeToggleInactiveClass } from "./editorStyles";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { cn } from "@/lib/utils";
import { collectKeySuggestionsFromContent } from "@/lib/jsonKeySuggestions";
import { normalizePerkTreeLayout } from "@/lib/perkTreeLayout";

type EditorMode = "tree" | "perkLayout" | "raw";

function isPerkTreeJsonPath(path: string) {
  return path.startsWith("game/perks/") && path.endsWith(".json") && !path.endsWith("/index.json");
}

function looksLikePerkTree(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const tree = value as { grid?: unknown; perks?: unknown };
  const grid = tree.grid as { width?: unknown; height?: unknown } | undefined;
  if (!grid || typeof grid !== "object") return false;
  if (typeof grid.width !== "number" || typeof grid.height !== "number") return false;
  if (!Array.isArray(tree.perks)) return false;
  return true;
}

function parseJson(content: string): { value: unknown } | { error: string } {
  try {
    return { value: JSON.parse(content) };
  } catch (error) {
    return { error: String(error) };
  }
}

function defaultEditorMode(path: string): EditorMode {
  return isPerkTreeJsonPath(path) ? "perkLayout" : "tree";
}

export function JsonEditor({
  path,
  content,
  savedContent,
  isDirty,
  loading,
  loadError,
  onContentChange,
  onSaved,
}: {
  path: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  loading: boolean;
  loadError: string | null;
  onContentChange: (content: string) => void;
  onSaved: (content: string) => void;
}) {
  const [mode, setMode] = useState<EditorMode>(() => defaultEditorMode(path));
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const appliedDefaultForPath = useRef<string | null>(null);

  const parsed = useMemo(() => (loading ? null : parseJson(content)), [content, loading]);
  const treeValue = parsed && "value" in parsed ? parsed.value : null;
  const parseError = parsed && "error" in parsed ? parsed.error : null;
  const showPerkLayoutMode = useMemo(
    () => isPerkTreeJsonPath(path) && !parseError && looksLikePerkTree(treeValue),
    [path, parseError, treeValue],
  );
  const canUsePerkLayout = useMemo(
    () => isPerkTreeJsonPath(path) && (loading || showPerkLayoutMode),
    [path, loading, showPerkLayoutMode],
  );
  const keySuggestions = useMemo(
    () => (loading ? [] : collectKeySuggestionsFromContent(content)),
    [loading, content],
  );

  useEffect(() => {
    setSaveError(null);
  }, [path, content]);

  useEffect(() => {
    appliedDefaultForPath.current = null;
    setSearchQuery("");
  }, [path]);

  useEffect(() => {
    if (loading) return;
    if (appliedDefaultForPath.current === path) return;
    appliedDefaultForPath.current = path;

    if (isPerkTreeJsonPath(path) && showPerkLayoutMode) {
      setMode("perkLayout");
      return;
    }

    if (!isPerkTreeJsonPath(path)) {
      setMode("tree");
      return;
    }

    setMode("tree");
  }, [path, loading, showPerkLayoutMode]);

  const updateTreeValue = useCallback(
    (value: unknown) => {
      onContentChange(`${JSON.stringify(value, null, 2)}\n`);
    },
    [onContentChange],
  );

  const handleSave = useCallback(async () => {
    if (parseError) return;
    setSaving(true);
    setSaveError(null);
    try {
      let contentToSave = content;
      if (showPerkLayoutMode && treeValue) {
        contentToSave = `${JSON.stringify(normalizePerkTreeLayout(treeValue), null, 2)}\n`;
        if (contentToSave !== content) {
          onContentChange(contentToSave);
        }
      }
      const saved = await saveFile(path, contentToSave);
      onSaved(saved);
    } catch (error) {
      setSaveError(String(error));
    } finally {
      setSaving(false);
    }
  }, [path, content, parseError, onSaved, showPerkLayoutMode, treeValue, onContentChange]);

  const handleRevert = useCallback(() => {
    if (!isDirty) return;
    if (!window.confirm("Revert all unsaved changes?")) return;
    onContentChange(savedContent);
    setSaveError(null);
  }, [isDirty, savedContent, onContentChange]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
      <Card className={cn(panelCardClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        <CardHeader className="flex-shrink-0 space-y-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-tight">{path.split("/").pop()}</CardTitle>
              <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">{path}</p>
            </div>
            {isDirty && (
              <span className="rounded-full border border-[var(--color-accent-muted)]/40 bg-[var(--color-accent-subtle)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Unsaved
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
                {canUsePerkLayout && (
                  <button
                    type="button"
                    onClick={() => setMode("perkLayout")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                      mode === "perkLayout" ? modeToggleActiveClass : modeToggleInactiveClass,
                    )}
                  >
                    <Move className="size-3.5" />
                    Perk layout
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode("tree")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                    mode === "tree" ? modeToggleActiveClass : modeToggleInactiveClass,
                  )}
                >
                  <ListTree className="size-3.5" />
                  Tree
                </button>
                <button
                  type="button"
                  onClick={() => setMode("raw")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
                    mode === "raw" ? modeToggleActiveClass : modeToggleInactiveClass,
                  )}
                >
                  <Code className="size-3.5" />
                  Raw
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleRevert} disabled={!isDirty || saving}>
                <RotateCcw className="size-3.5" />
                Revert
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={!isDirty || saving || !!parseError}>
                <Save className="size-3.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {(loadError || saveError || parseError) && (
          <div className="flex items-start gap-2.5 border-b border-[var(--color-error)]/25 bg-[var(--color-error)]/8 px-4 py-2.5 text-xs text-[var(--color-error-muted)]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-[var(--color-error)]" />
            <div className="space-y-1">
              {loadError && <p>Load error: {loadError}</p>}
              {parseError && <p>JSON parse error: {parseError}</p>}
              {saveError && <p>Save error: {saveError}</p>}
            </div>
          </div>
        )}

        <CardContent
          className={cn(
            "min-h-0 flex-1 p-4",
            mode === "perkLayout" ? "flex flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {loading ? (
            mode === "perkLayout" ? (
              <p className="text-sm text-[var(--color-muted)]">Loading perk layout…</p>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">Loading file…</p>
            )
          ) : mode === "raw" ? (
            <JsonRawEditor value={content} onChange={onContentChange} keySuggestions={keySuggestions} />
          ) : mode === "perkLayout" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <PerkTreeLayoutEditor value={treeValue} onCommit={updateTreeValue} />
            </div>
          ) : parseError ? (
            <p className="text-sm text-[var(--color-muted)]">
              Switch to Raw mode to fix JSON syntax, or revert changes.
            </p>
          ) : (
            <EditorFileProvider path={path}>
            <TreeSearchProvider query={searchQuery}>
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 shadow-[var(--shadow-panel)]">
                <Search className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter entries…"
                  className={cn(fieldInputClass, "h-8 border-transparent bg-transparent shadow-none focus:border-transparent focus:shadow-none")}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <JsonNode value={treeValue} onChange={updateTreeValue} keySuggestions={keySuggestions} />
            </TreeSearchProvider>
            </EditorFileProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
