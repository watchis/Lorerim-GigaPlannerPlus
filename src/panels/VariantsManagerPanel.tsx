import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Download,
  GripVertical,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { WorkspacePanelHeader } from "@/components/WorkspacePanelHeader";
import { VariantOption, variantSelectItemClassName } from "@/components/VariantOption";
import {
  VariantSelectField,
  variantSelectTriggerClassName,
} from "@/components/VariantSelectField";
import { VariantNotesEditor } from "@/components/VariantNotesEditor";
import { VariantNotesMarkdown } from "@/components/VariantNotesMarkdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  BUILD_BACKUP_EXTENSION,
  buildBackupFilename,
  createExportedVariant,
  downloadBackupFile,
  parseExportedVariant,
  readBackupFile,
} from "@/lib/buildIO";
import {
  getActiveSavedBuild,
  getVariantBuild,
  getVariantCount,
  getVariantIdAtIndex,
  getVariantName,
  getVariantNotes,
  listBuildVariants,
} from "@/store/savedBuilds";
import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { usePanelLabels, useThemeConfig } from "@/theme/ThemeProvider";
import {
  createNotesPaneState,
  getInitialNotesState,
} from "@/panels/variantNotesState";
import { persistPendingVariantNotes } from "@/panels/variantNotesPersist";

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function variantKey(id: string | null): string {
  return id ?? "default";
}

function stopPropagation(event: MouseEvent | KeyboardEvent | DragEvent) {
  event.stopPropagation();
}

function StatusBanner({ type, message }: { type: "success" | "error"; message: string }) {
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm",
        type === "success"
          ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-foreground)]",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface VariantActionProps {
  label: string;
  disabledLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}

function VariantAction({
  label,
  disabledLabel,
  onClick,
  disabled,
  destructive,
  children,
}: VariantActionProps) {
  const tooltipLabel = disabled && disabledLabel ? disabledLabel : label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              destructive && "text-[var(--color-error)] hover:text-[var(--color-error)]",
            )}
            disabled={disabled}
            onClick={(event) => {
              stopPropagation(event);
              onClick();
            }}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

interface AddVariantSectionProps {
  labels: Record<string, string>;
  backupExtension: string;
  fileDragOver: boolean;
  onCreate: () => void;
  onBrowse: () => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
}

function AddVariantSection({
  labels,
  backupExtension,
  fileDragOver,
  onCreate,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
}: AddVariantSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/30 p-1 shadow-[var(--shadow-panel)]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/[0.08] via-transparent to-[var(--color-accent-muted)]/[0.05]"
        aria-hidden
      />

      <div className="relative grid gap-1 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreate}
          className="group flex gap-2 rounded-[calc(var(--radius-lg)-4px)] border border-transparent bg-[var(--color-surface-elevated)]/50 p-3.5 text-left transition-all hover:border-[var(--color-accent)]/35 hover:bg-[var(--color-surface-elevated)]/90 hover:shadow-[var(--shadow-glow)]"
        >
          <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
          <div className="min-w-0 space-y-1">
            <span className="block text-sm font-semibold text-[var(--color-foreground)]">
              {labels.createNew}
            </span>
            <span className="block text-xs leading-relaxed text-[var(--color-muted)]">
              {labels.createHint}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onBrowse}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "group flex gap-2 rounded-[calc(var(--radius-lg)-4px)] border p-3.5 text-left transition-all",
            fileDragOver
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-[var(--shadow-glow)]"
              : "border-transparent bg-[var(--color-surface-elevated)]/35 hover:border-[var(--color-accent-muted)]/50 hover:bg-[var(--color-surface-elevated)]/80",
          )}
        >
          {fileDragOver ? (
            <Archive className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
          ) : (
            <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-muted)] transition-colors group-hover:text-[var(--color-accent)]" />
          )}
          <div className="min-w-0 space-y-1">
            <span className="block text-sm font-semibold text-[var(--color-foreground)]">
              {labels.importTitle}
            </span>
            <span className="block text-xs leading-relaxed text-[var(--color-muted)]">
              {formatLabel(labels.importHint, { extension: backupExtension })}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}

interface VariantRowProps {
  index: number;
  variant: {
    id: string | null;
    name: string;
    level: number;
    perkCount: number;
    notes: string;
  };
  isActive: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  renameValue: string;
  canDelete: boolean;
  canReorder: boolean;
  labels: Record<string, string>;
  variantLabels: Record<string, string>;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onCopy: () => void;
  onStartRename: () => void;
  onOpenNotes: () => void;
  onExport: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverItem: () => void;
  onDropItem: (fromIndex: number) => void;
}

function VariantRow({
  index,
  variant,
  isActive,
  isRenaming,
  isDragging,
  isDragOver,
  renameValue,
  canDelete,
  canReorder,
  labels,
  variantLabels,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onSelect,
  onCopy,
  onStartRename,
  onOpenNotes,
  onExport,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDropItem,
}: VariantRowProps) {
  const suppressClickRef = useRef(false);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder || isRenaming) {
      event.preventDefault();
      return;
    }

    stopPropagation(event);
    suppressClickRef.current = true;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    onDragStart();
  };

  const handleDragEnd = (event: DragEvent<HTMLDivElement>) => {
    stopPropagation(event);
    onDragEnd();
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder || isRenaming) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragOverItem();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder || isRenaming) return;
    event.preventDefault();
    stopPropagation(event);
    const fromIndex = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(fromIndex)) {
      onDropItem(fromIndex);
    }
  };

  const handleSelect = () => {
    if (suppressClickRef.current || isActive) return;
    onSelect();
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <input
          value={renameValue}
          onChange={(event) => onRenameValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommitRename();
            if (event.key === "Escape") onCancelRename();
          }}
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCommitRename}>
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCancelRename}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      draggable={canReorder}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (isActive || event.key !== "Enter") return;
        event.preventDefault();
        handleSelect();
      }}
      role={isActive ? undefined : "button"}
      tabIndex={isActive ? undefined : 0}
      className={cn(
        "relative flex items-center gap-2 transition-all",
        isDragging && "opacity-40",
        isDragOver && "z-10 ring-1 ring-inset ring-[var(--color-accent)]/50",
        isActive && "bg-[var(--color-accent)]/[0.04]",
        canReorder && "cursor-grab active:cursor-grabbing",
        !isActive && !isDragging && "hover:bg-[var(--color-surface-elevated)]/80",
      )}
    >
        {isActive && (
          <div className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--color-accent)]" />
        )}

        <div
          className={cn(
            "flex shrink-0 touch-none items-center px-2 text-[var(--color-muted)]",
            canReorder ? "cursor-grab active:cursor-grabbing" : "opacity-30",
          )}
          aria-hidden
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 py-3 pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-[var(--color-foreground)]">
              {variant.name}
            </h4>
            {variant.notes.trim() && (
              <span className="rounded-full bg-[var(--color-surface-elevated)]/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {labels["notesBadge"] ?? "Notes"}
              </span>
            )}
            {isActive && (
              <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
                {labels.activeBadge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {formatLabel(variantLabels.stepMeta, {
              level: variant.level,
              perks: variant.perkCount,
            })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pr-2" onClick={stopPropagation}>
          <VariantAction label={labels.copy} onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
          </VariantAction>
          <VariantAction label={labels.rename} onClick={onStartRename}>
            <Pencil className="h-3.5 w-3.5" />
          </VariantAction>
          <VariantAction label={labels["notes"] ?? "Notes"} onClick={onOpenNotes}>
            <StickyNote className="h-3.5 w-3.5" />
          </VariantAction>
          <VariantAction label={labels.export} onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
          </VariantAction>
          <VariantAction
            label={labels.delete}
            disabledLabel={labels.deleteOnlyVariant}
            onClick={onDelete}
            disabled={!canDelete}
            destructive
          >
            <Trash2 className="h-3.5 w-3.5" />
          </VariantAction>
        </div>
    </div>
  );
}

export function VariantsManagerPanel() {
  const labels = usePanelLabels("variants-manager");
  const { labels: allLabels } = useThemeConfig();
  const variantLabels = allLabels.milestones;
  const closeVariantsManager = useUiStore((s) => s.closeVariantsManager);
  const initialPane = useUiStore((s) => s.variantsManagerInitialPane);
  const initialVariantId = useUiStore((s) => s.variantsManagerInitialVariantId);
  const variantNotesRequestId = useUiStore((s) => s.variantNotesRequestId);
  const variantsManagerRequestId = useUiStore((s) => s.variantsManagerRequestId);
  const gameData = useBuildStore((s) => s.gameData);
  const savedBuilds = useBuildStore((s) => s.savedBuilds);
  const activeBuildId = useBuildStore((s) => s.activeBuildId);
  const selectMilestone = useBuildStore((s) => s.selectMilestone);
  const createVariant = useBuildStore((s) => s.createVariant);
  const copyVariant = useBuildStore((s) => s.copyVariant);
  const importVariant = useBuildStore((s) => s.importVariant);
  const deleteVariant = useBuildStore((s) => s.deleteVariant);
  const renameVariant = useBuildStore((s) => s.renameVariant);
  const reorderVariants = useBuildStore((s) => s.reorderVariants);
  const setVariantNotes = useBuildStore((s) => s.setVariantNotes);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [fileDragOver, setFileDragOver] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const entry = getActiveSavedBuild(savedBuilds, activeBuildId);
  const initialNotesState = getInitialNotesState(initialPane, initialVariantId, entry);
  const [notesVariantIndex, setNotesVariantIndex] = useState(initialNotesState.variantIndex);
  const [notesDraft, setNotesDraft] = useState(initialNotesState.draft);
  const [notesEditing, setNotesEditing] = useState(initialNotesState.editing);
  const [activePane, setActivePane] = useState<"manage" | "notes">(initialPane);
  const notesDraftRef = useRef(notesDraft);
  const notesVariantIndexRef = useRef(notesVariantIndex);
  const activePaneRef = useRef(activePane);
  const notesPaneReadyRef = useRef(false);
  notesDraftRef.current = notesDraft;
  notesVariantIndexRef.current = notesVariantIndex;
  activePaneRef.current = activePane;

  if (!entry || !gameData) return null;

  const variants = listBuildVariants(entry);
  const variantCount = getVariantCount(entry);
  const canDeleteVariant = variantCount > 1;
  const canReorderVariants = variantCount > 1;
  const activeVariantId = entry.activeMilestoneId;
  const modpackVersion = gameData.game.manifest.version;
  const backupExtension = allLabels.panels["build-library"].backupExtension;

  const notesVariant = variants[notesVariantIndex] ?? null;

  useEffect(() => {
    if (activePane !== "notes") return;
    if (notesVariantIndex < variants.length) return;
    setNotesVariantIndex(Math.max(0, variants.length - 1));
  }, [activePane, notesVariantIndex, variants.length]);

  useEffect(() => {
    if (variantNotesRequestId === 0) return;

    const targetVariantId = initialVariantId;
    if (notesPaneReadyRef.current) {
      persistPendingVariantNotes(
        activePaneRef.current,
        notesVariantIndexRef.current,
        notesDraftRef.current,
      );
    }

    const { savedBuilds, activeBuildId } = useBuildStore.getState();
    const refreshedEntry = getActiveSavedBuild(savedBuilds, activeBuildId);
    if (!refreshedEntry) return;

    const nextState = createNotesPaneState(refreshedEntry, targetVariantId);
    setActivePane("notes");
    setNotesVariantIndex(nextState.variantIndex);
    setNotesDraft(nextState.draft);
    setNotesEditing(nextState.editing);
    notesPaneReadyRef.current = true;
  }, [variantNotesRequestId, initialVariantId]);

  useEffect(() => {
    if (variantsManagerRequestId === 0) return;

    persistPendingVariantNotes(
      activePaneRef.current,
      notesVariantIndexRef.current,
      notesDraftRef.current,
    );
    setActivePane("manage");
  }, [variantsManagerRequestId]);

  useEffect(() => {
    const flush = () => {
      persistPendingVariantNotes(
        activePaneRef.current,
        notesVariantIndexRef.current,
        notesDraftRef.current,
      );
    };

    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  useEffect(() => {
    if (activePane !== "notes" || !notesEditing) return;

    const variantIndex = notesVariantIndex;
    const { savedBuilds, activeBuildId } = useBuildStore.getState();
    const refreshedEntry = getActiveSavedBuild(savedBuilds, activeBuildId);
    if (!refreshedEntry) return;

    const variantId = getVariantIdAtIndex(refreshedEntry, variantIndex);
    const persisted = getVariantNotes(refreshedEntry, variantId);
    if (notesDraft === persisted) return;

    const draft = notesDraft;
    const timer = window.setTimeout(() => {
      const latest = useBuildStore.getState();
      const latestEntry = getActiveSavedBuild(latest.savedBuilds, latest.activeBuildId);
      if (!latestEntry) return;
      setVariantNotes(getVariantIdAtIndex(latestEntry, variantIndex), draft);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [activePane, notesDraft, notesEditing, notesVariantIndex, setVariantNotes]);

  const startRename = (id: string | null, name: string) => {
    setRenamingKey(variantKey(id));
    setRenameValue(name);
  };

  const commitRename = (id: string | null) => {
    renameVariant(id, renameValue);
    setRenamingKey(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenamingKey(null);
    setRenameValue("");
  };

  const showImportSuccess = (message: string) => {
    setImportSuccess(message);
    setImportError(null);
    setTimeout(() => setImportSuccess(null), 4000);
  };

  const handleImportFile = async (file: File) => {
    try {
      const data = await readBackupFile(file);
      const record = data as Record<string, unknown>;
      if (record.format === "lorerim-build-library") {
        throw new Error(labels.importError);
      }

      const exported = parseExportedVariant(data);
      importVariant(exported.build, exported.name, exported.notes);
      showImportSuccess(labels.importedVariant);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : labels.importError);
      setImportSuccess(null);
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setFileDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleImportFile(file);
  };

  const handleExportVariant = (variantId: string | null) => {
    const name = getVariantName(entry, variantId);
    const build = getVariantBuild(entry, variantId);
    const notes = getVariantNotes(entry, variantId);
    downloadBackupFile(
      buildBackupFilename(name),
      createExportedVariant(name, build, modpackVersion, notes),
    );
  };

  const openNotes = (variantId: string | null) => {
    persistPendingVariantNotes(activePane, notesVariantIndex, notesDraft);

    const refreshedEntry =
      getActiveSavedBuild(useBuildStore.getState().savedBuilds, useBuildStore.getState().activeBuildId) ??
      entry;
    const nextState = createNotesPaneState(refreshedEntry, variantId);
    setNotesVariantIndex(nextState.variantIndex);
    setNotesDraft(nextState.draft);
    setNotesEditing(nextState.editing);
    setActivePane("notes");
  };

  const backToManageVariants = () => {
    persistPendingVariantNotes(activePane, notesVariantIndex, notesDraft);
    setActivePane("manage");
  };

  const finishNotesEditing = () => {
    const refreshedEntry = getActiveSavedBuild(
      useBuildStore.getState().savedBuilds,
      useBuildStore.getState().activeBuildId,
    );
    if (!refreshedEntry) return;

    const variantId = getVariantIdAtIndex(refreshedEntry, notesVariantIndexRef.current);
    setVariantNotes(variantId, notesDraftRef.current);
    setNotesEditing(false);
  };

  const switchNotesVariant = (value: string) => {
    const variantIndex = Number(value);
    if (Number.isNaN(variantIndex) || variantIndex === notesVariantIndex) return;

    persistPendingVariantNotes(activePane, notesVariantIndex, notesDraft);

    const refreshedEntry = getActiveSavedBuild(
      useBuildStore.getState().savedBuilds,
      useBuildStore.getState().activeBuildId,
    );
    if (!refreshedEntry) return;

    const variantId = getVariantIdAtIndex(refreshedEntry, variantIndex);
    const nextState = createNotesPaneState(refreshedEntry, variantId);
    setNotesVariantIndex(nextState.variantIndex);
    setNotesDraft(nextState.draft);
    setNotesEditing(nextState.editing);
  };

  const notesVariantSelectValue = String(notesVariantIndex);

  const notesPlaceholder =
    labels["notesPlaceholder"] ??
    "Add notes for this variant (supports **bold**, *italic*, lists, and links)";

  const handleVariantDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      reorderVariants(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearVariantDrag = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkspacePanelHeader
        back={{
          label: labels.back,
          onClick: activePane === "notes" ? backToManageVariants : closeVariantsManager,
        }}
        title={activePane === "manage" ? labels.title : undefined}
        subtitle={
          activePane === "manage"
            ? formatLabel(labels.variantCount, { count: variantCount })
            : undefined
        }
        titleRow={
          activePane === "notes" ? (
            <div className="flex min-w-0 items-center gap-2">
              <StickyNote className="h-5 w-5 shrink-0 text-[var(--color-accent-muted)]" />
              <CardTitle className="min-w-0 truncate text-base">
                {labels["notesTitle"] ?? labels["notes"] ?? "Notes"}
              </CardTitle>
            </div>
          ) : undefined
        }
      />

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {activePane === "manage" ? (
          <>
            <div className="shrink-0 space-y-4 px-4 py-4">
              <AddVariantSection
                labels={labels}
                backupExtension={backupExtension}
                fileDragOver={fileDragOver}
                onCreate={() => createVariant()}
                onBrowse={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setFileDragOver(true);
                }}
                onDragLeave={() => setFileDragOver(false)}
                onDrop={handleFileDrop}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept={`${BUILD_BACKUP_EXTENSION},.json,application/json`}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImportFile(file);
                  event.target.value = "";
                }}
              />

              {(importSuccess || importError) && (
                <StatusBanner
                  type={importSuccess ? "success" : "error"}
                  message={importSuccess ?? importError ?? ""}
                />
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-4">
              <h3 className="shrink-0 px-1 text-sm font-semibold text-[var(--color-foreground)]">
                {labels.variantsSection}
              </h3>

              <ScrollArea className="min-h-0 flex-1">
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20">
                  {variants.map((variant, index) => {
                    const key = variantKey(variant.id);
                    const isActive = activeVariantId === variant.id;
                    const isRenaming = renamingKey === key;

                    return (
                      <div
                        key={key}
                        className={cn(index > 0 && "border-t border-[var(--color-border)]/50")}
                      >
                        <VariantRow
                          index={index}
                          variant={variant}
                          isActive={isActive}
                          isRenaming={isRenaming}
                          isDragging={draggedIndex === index}
                          isDragOver={dragOverIndex === index && draggedIndex !== index}
                          renameValue={renameValue}
                          canDelete={canDeleteVariant}
                          canReorder={canReorderVariants}
                          labels={labels}
                          variantLabels={variantLabels}
                          onRenameValueChange={setRenameValue}
                          onCommitRename={() => commitRename(variant.id)}
                          onCancelRename={cancelRename}
                          onSelect={() => selectMilestone(variant.id)}
                          onCopy={() => copyVariant(variant.id)}
                          onStartRename={() => startRename(variant.id, variant.name)}
                          onOpenNotes={() => openNotes(variant.id)}
                          onExport={() => handleExportVariant(variant.id)}
                          onDelete={() => deleteVariant(variant.id)}
                          onDragStart={() => setDraggedIndex(index)}
                          onDragEnd={clearVariantDrag}
                          onDragOverItem={() => setDragOverIndex(index)}
                          onDropItem={(fromIndex) => handleVariantDrop(fromIndex, index)}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2">
            <div className="flex shrink-0 items-end gap-3">
              <VariantSelectField label={variantLabels.title} className="min-w-0 flex-1">
                <Select value={notesVariantSelectValue} onValueChange={switchNotesVariant}>
                  <SelectTrigger className={variantSelectTriggerClassName}>
                    <SelectValue
                      className="min-w-0 flex-1 overflow-hidden"
                      placeholder={labels["notesVariant"] ?? "Variant"}
                    >
                      {notesVariant ? (
                        <VariantOption
                          name={notesVariant.name}
                          levelText={formatLabel(variantLabels.levelShort, {
                            level: notesVariant.level,
                          })}
                        />
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={5}
                    className="w-[var(--radix-select-trigger-width)] text-sm [&>div]:p-1"
                  >
                    {variants.map((variant, index) => (
                      <SelectItem
                        key={variantKey(variant.id)}
                        value={String(index)}
                        className={variantSelectItemClassName}
                      >
                        <VariantOption
                          name={variant.name}
                          levelText={formatLabel(variantLabels.levelShort, {
                            level: variant.level,
                          })}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </VariantSelectField>

              {notesEditing ? (
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={!notesVariant}
                  onClick={finishNotesEditing}
                  aria-label={labels["doneNotes"] ?? "Done editing"}
                  title={labels["doneNotes"] ?? "Done editing"}
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5"
                  disabled={!notesVariant}
                  onClick={() => setNotesEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {labels["editNotes"] ?? "Edit"}
                </Button>
              )}
            </div>

            <div className="mt-2 min-h-0 flex-1" key={notesVariantIndex}>
              {notesEditing ? (
                <VariantNotesEditor
                  value={notesVariant ? notesDraft : ""}
                  onChange={setNotesDraft}
                  placeholder={notesPlaceholder}
                  disabled={!notesVariant}
                  showToolbar
                />
              ) : (
                <ScrollArea className="h-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60">
                  <div className="px-3 py-2">
                    {notesVariant && notesDraft.trim() ? (
                      <VariantNotesMarkdown content={notesDraft} />
                    ) : (
                      <p className="text-sm italic text-[var(--color-muted)]">{notesPlaceholder}</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
