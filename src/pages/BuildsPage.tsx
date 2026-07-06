import { useMemo, useRef, useState, type DragEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Archive,
  Copy,
  Download,
  GripVertical,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PickerSearchInput, matchesPickerSearch } from "@/components/PickerSearchInput";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BugReportButton } from "@/components/BugReportButton";
import type { GameData } from "@/data/schemas";
import {
  decodeBuildPackage,
  encodeSavedBuild,
} from "@/engine/buildCodec";
import type { BuildState } from "@/engine/buildEngine";
import {
  buildBackupFilename,
  buildShareUrl,
  BUILD_BACKUP_EXTENSION,
  createExportedBuild,
  createExportedLibrary,
  downloadBackupFile,
  LIBRARY_BACKUP_FILENAME,
  parseExportedBuild,
  parseExportedLibrary,
  readBackupFile,
} from "@/lib/buildIO";
import { cn } from "@/lib/utils";
import { usePanelLabels, useThemeConfig } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import type { SavedBuild } from "@/store/savedBuilds";
import {
  getActiveSavedBuildBuild,
  getDefaultVariantName,
  normalizeSavedBuild,
  updateSavedBuildInList,
} from "@/store/savedBuilds";

type MobileBuildsTab = "builds" | "transfer";

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function getBuildSummary(build: BuildState, game: GameData, labels: Record<string, string>) {
  const raceName =
    build.raceId && build.raceId !== "none"
      ? game.races.find((race) => race.id === build.raceId)?.name
      : null;

  const level = build.playerLevel ?? game.mechanics.leveling.baseLevel;

  return {
    raceLabel: raceName ?? labels.noRace,
    level,
    perkCount: build.selectedPerkIds.length,
  };
}

interface BuildActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}

function BuildAction({ label, onClick, disabled, destructive, children }: BuildActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              destructive && "text-[var(--color-error)] hover:text-[var(--color-error)]",
            )}
            disabled={disabled}
            onClick={(event) => {
              stopPropagation(event);
              onClick();
            }}
            aria-label={label}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function stopPropagation(event: MouseEvent | DragEvent) {
  event.stopPropagation();
}

function ImportFeedbackLine({ feedback }: { feedback: ImportFeedback | null }) {
  if (!feedback) return null;

  const Icon = feedback.type === "success" ? CheckCircle2 : AlertCircle;
  const isError = feedback.type === "error";

  return (
    <div
      className={cn(
        "flex items-center gap-2 leading-snug",
        isError
          ? "rounded-[var(--radius-md)] border border-[var(--color-error)]/50 bg-[var(--color-error)]/10 px-2.5 py-1.5 text-sm font-medium text-[var(--color-error)]"
          : "text-xs text-[var(--color-accent)]",
      )}
      role={isError ? "alert" : "status"}
    >
      <Icon className={cn("shrink-0", isError ? "h-4 w-4" : "h-3.5 w-3.5")} />
      <span>{feedback.message}</span>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
  compact = false,
}: {
  icon: typeof Link2;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <CardHeader className={cn("pb-3", compact && "pb-2")}>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {!compact && (
            <CardDescription className="mt-1 text-xs leading-relaxed">{description}</CardDescription>
          )}
        </div>
      </div>
    </CardHeader>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
      {children}
    </p>
  );
}

interface ActiveBuildCodeBlockProps {
  buildName: string | undefined;
  code: string;
  labels: Record<string, string>;
  copiedAction: "code" | "link" | null;
  onCopyCode: () => void;
  onCopyLink: () => void;
}

function ActiveBuildCodeBlock({
  buildName,
  code,
  labels,
  copiedAction,
  onCopyCode,
  onCopyLink,
}: ActiveBuildCodeBlockProps) {
  return (
    <div className="space-y-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {labels.activeBuildCode}
        </p>
        <p className="mt-1 truncate font-medium text-[var(--color-foreground)]">
          {buildName ?? labels.unnamedBuild}
        </p>
      </div>

      <button
        type="button"
        onClick={onCopyCode}
        aria-live="polite"
        className={cn(
          "group flex w-full items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors",
          copiedAction === "code"
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 hover:border-[var(--color-accent-muted)]",
        )}
      >
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--color-accent)] sm:break-normal sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap">
          {code}
        </code>
        {copiedAction === "code" ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[var(--color-accent)]">
            <Check className="h-4 w-4" />
            <span className="text-xs font-medium">{labels.copiedCode}</span>
          </span>
        ) : (
          <Copy className="h-4 w-4 shrink-0 text-[var(--color-muted)] group-hover:text-[var(--color-accent)]" />
        )}
      </button>

      <Button
        variant={copiedAction === "link" ? "default" : "outline"}
        size="sm"
        className={cn(
          "w-full transition-colors",
          copiedAction === "link" && "bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90",
        )}
        onClick={onCopyLink}
      >
        {copiedAction === "link" ? (
          <>
            <Check className="h-3.5 w-3.5" />
            {labels.copiedLink}
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" />
            {labels.copyLink}
          </>
        )}
      </Button>
    </div>
  );
}

interface ImportFeedback {
  type: "success" | "error";
  message: string;
  context: "code" | "file";
}

interface TransferSidebarProps {
  labels: Record<string, string>;
  activeBuildName: string | undefined;
  activeBuildCode: string;
  codeInput: string;
  onCodeInputChange: (value: string) => void;
  onImportCode: (replaceActive: boolean) => void;
  onCopyActiveCode: () => void;
  onCopyActiveLink: () => void;
  activeCodeCopied: "code" | "link" | null;
  importFeedback: ImportFeedback | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileDragOver: boolean;
  onFileDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onFileDragLeave: () => void;
  onFileDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onFileSelect: (file: File) => void;
  onExportActive: () => void;
  onExportLibrary: () => void;
}

function TransferSidebar({
  labels,
  activeBuildName,
  activeBuildCode,
  codeInput,
  onCodeInputChange,
  onImportCode,
  onCopyActiveCode,
  onCopyActiveLink,
  activeCodeCopied,
  importFeedback,
  fileInputRef,
  fileDragOver,
  onFileDragOver,
  onFileDragLeave,
  onFileDrop,
  onFileSelect,
  onExportActive,
  onExportLibrary,
}: TransferSidebarProps) {
  const codeFeedback = importFeedback?.context === "code" ? importFeedback : null;
  const fileFeedback = importFeedback?.context === "file" ? importFeedback : null;

  return (
    <div className="min-w-0 space-y-3">
      <Card className="min-w-0 overflow-hidden">
        <PanelHeader
          icon={Link2}
          title={labels.shareCodeTitle}
          description={labels.shareCodeDescription}
          compact
        />
        <CardContent className="space-y-3">
          <ActiveBuildCodeBlock
            buildName={activeBuildName}
            code={activeBuildCode}
            labels={labels}
            copiedAction={activeCodeCopied}
            onCopyCode={onCopyActiveCode}
            onCopyLink={onCopyActiveLink}
          />

          <div className="space-y-2 border-t border-[var(--color-border)]/60 pt-3">
            <SectionLabel>{labels.importCodeTitle}</SectionLabel>
            <div className="flex flex-col gap-2">
              <textarea
                id="import-code"
                value={codeInput}
                onChange={(e) => onCodeInputChange(e.target.value)}
                placeholder={labels.importCodePlaceholder}
                rows={2}
                aria-invalid={codeFeedback?.type === "error"}
                className={cn(
                  "w-full resize-none rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/60 px-3 py-2 font-mono text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2",
                  codeFeedback?.type === "error"
                    ? "border-[var(--color-error)] bg-[var(--color-error)]/5 focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/25"
                    : "border-[var(--color-border)] focus:border-[var(--color-accent-muted)] focus:ring-[var(--color-accent)]/30",
                )}
              />
              <div>
                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!codeInput.trim()}
                    onClick={() => onImportCode(false)}
                  >
                    {labels.importAsNew}
                  </Button>
                  <Button size="sm" disabled={!codeInput.trim()} onClick={() => onImportCode(true)}>
                    {labels.importToActive}
                  </Button>
                </div>
                {codeFeedback && (
                  <div className="pt-2">
                    <ImportFeedbackLine feedback={codeFeedback} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <PanelHeader
          icon={Archive}
          title={labels.backupTitle}
          description={formatLabel(labels.backupDescription, { extension: labels.backupExtension })}
          compact
        />
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <SectionLabel>{labels.backupImportTitle}</SectionLabel>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={`${BUILD_BACKUP_EXTENSION},.json,application/json`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelect(file);
                  e.target.value = "";
                }}
              />
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onFileDragOver}
                  onDragLeave={onFileDragLeave}
                  onDrop={onFileDrop}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed px-3 text-center transition-colors",
                    fileFeedback ? "py-2.5" : "py-4",
                    fileFeedback?.type === "error"
                      ? "border-[var(--color-error)] bg-[var(--color-error)]/5 text-[var(--color-foreground)]"
                      : fileDragOver
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-foreground)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <Archive className="h-5 w-5 shrink-0 text-[var(--color-accent-muted)]" />
                  <span className="text-sm">{labels.chooseBackupFile}</span>
                  <span className="text-xs text-[var(--color-muted)]">{labels.backupExtension}</span>
                </button>
                {fileFeedback && (
                  <div className="pt-2">
                    <ImportFeedbackLine feedback={fileFeedback} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--color-border)]/60 pt-3">
            <SectionLabel>{labels.backupExportTitle}</SectionLabel>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onExportActive}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-3 py-2 text-left transition-colors hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-surface-elevated)]"
              >
                <Download className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-foreground)]">{labels.exportActive}</span>
              </button>
              <button
                type="button"
                onClick={onExportLibrary}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-3 py-2 text-left transition-colors hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-surface-elevated)]"
              >
                <Download className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-foreground)]">{labels.exportAll}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SavedBuildCardProps {
  index: number;
  entry: SavedBuild;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  canReorder: boolean;
  canDelete: boolean;
  labels: Record<string, string>;
  milestoneLabels: Record<string, string>;
  game: GameData;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverItem: () => void;
  onDropItem: (fromIndex: number) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function SavedBuildCard({
  index,
  entry,
  isActive,
  isDragging,
  isDragOver,
  canReorder,
  canDelete,
  labels,
  milestoneLabels,
  game,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverItem,
  onDropItem,
  onRename,
  onDelete,
}: SavedBuildCardProps) {
  const suppressClickRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(entry.name);
  const activeBuild = getActiveSavedBuildBuild(entry);
  const summary = getBuildSummary(activeBuild, game, labels);

  const startEditing = () => {
    setDraftName(entry.name);
    setEditing(true);
  };

  const commitRename = () => {
    onRename(draftName);
    setEditing(false);
  };

  const cancelEditing = () => {
    setDraftName(entry.name);
    setEditing(false);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder || editing) {
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
    if (!canReorder || editing) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragOverItem();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorder || editing) return;
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

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") cancelEditing();
          }}
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={commitRename} aria-label={labels.saveRename}>
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={cancelEditing} aria-label={labels.cancelRename}>
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
      aria-label={canReorder ? labels.dragToReorder : undefined}
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
        <div className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
      )}

      <div
        className={cn(
          "flex shrink-0 touch-none items-center px-2 text-[var(--color-muted)]",
          canReorder ? "cursor-grab active:cursor-grabbing max-lg:hidden" : "hidden",
        )}
        aria-hidden
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 py-3 pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--color-foreground)]">{entry.name}</h4>
          {isActive && (
            <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
              {labels.activeBadge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {summary.raceLabel} ·{" "}
          {formatLabel(milestoneLabels.stepMeta, { level: summary.level, perks: summary.perkCount })} ·{" "}
          {formatUpdatedAt(entry.updatedAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 pr-2" onClick={stopPropagation}>
        <BuildAction label={labels.renameBuild} onClick={startEditing}>
          <Pencil className="h-3.5 w-3.5" />
        </BuildAction>
        <BuildAction label={labels.deleteBuild} onClick={onDelete} disabled={!canDelete} destructive>
          <Trash2 className="h-3.5 w-3.5" />
        </BuildAction>
      </div>
    </div>
  );
}

export function BuildsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { labels: allLabels } = useThemeConfig();
  const labels = usePanelLabels("build-library");
  const milestoneLabels = allLabels.milestones;
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const savedBuilds = useBuildStore((s) => s.savedBuilds);
  const activeBuildId = useBuildStore((s) => s.activeBuildId);
  const createSavedBuildSlot = useBuildStore((s) => s.createSavedBuildSlot);
  const deleteSavedBuildSlot = useBuildStore((s) => s.deleteSavedBuildSlot);
  const renameSavedBuildSlot = useBuildStore((s) => s.renameSavedBuildSlot);
  const selectSavedBuildSlot = useBuildStore((s) => s.selectSavedBuildSlot);
  const loadSharedBuild = useBuildStore((s) => s.loadSharedBuild);
  const importSharedBuild = useBuildStore((s) => s.importSharedBuild);
  const importBuildAsSlot = useBuildStore((s) => s.importBuildAsSlot);
  const importBuildLibrary = useBuildStore((s) => s.importBuildLibrary);
  const reorderSavedBuildSlot = useBuildStore((s) => s.reorderSavedBuildSlot);

  const [codeInput, setCodeInput] = useState("");
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeCodeCopied, setActiveCodeCopied] = useState<"code" | "link" | null>(null);
  const [buildSearchQuery, setBuildSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileBuildsTab>("builds");

  const visibleBuilds = useMemo(() => {
    if (!gameData) return [];

    return savedBuilds
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => {
        const activeVariant = getActiveSavedBuildBuild(entry);
        const summary = getBuildSummary(activeVariant, gameData.game, labels);
        return matchesPickerSearch(buildSearchQuery, [
          entry.name,
          summary.raceLabel,
          String(summary.level),
        ]);
      });
  }, [savedBuilds, buildSearchQuery, gameData, labels]);

  if (!gameData) return null;

  const modpackVersion = gameData.game.manifest.version;
  const activeBuild = savedBuilds.find((entry) => entry.id === activeBuildId);
  const syncedActiveBuild = activeBuild
    ? updateSavedBuildInList(savedBuilds, activeBuildId, build).find(
        (entry) => entry.id === activeBuildId,
      )
    : null;
  const activeBuildCode = syncedActiveBuild
    ? encodeSavedBuild(normalizeSavedBuild(syncedActiveBuild), gameData.game)
    : "";
  const isFilteringBuilds = buildSearchQuery.trim().length > 0;

  const showSuccess = (message: string, context: ImportFeedback["context"]) => {
    setImportFeedback({ type: "success", message, context });
    setTimeout(() => setImportFeedback(null), 4000);
  };

  const handleImportCode = (replaceActive: boolean) => {
    try {
      const decoded = decodeBuildPackage(codeInput.trim(), gameData.game);
      if (replaceActive) {
        loadSharedBuild(decoded);
        showSuccess(labels.importedToActive, "code");
      } else {
        importSharedBuild(decoded);
        showSuccess(labels.importedAsNew, "code");
      }
      setCodeInput("");
    } catch {
      setImportFeedback({
        type: "error",
        message: allLabels.errors.invalidBuildCode,
        context: "code",
      });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const data = await readBackupFile(file);
      const record = data as Record<string, unknown>;

      if (record.format === "lorerim-build-library") {
        const library = parseExportedLibrary(data);
        if (library.savedBuilds.length === 0) {
          throw new Error(labels.importEmptyLibrary);
        }
        importBuildLibrary(library.savedBuilds);
        showSuccess(labels.importedLibrary, "file");
      } else {
        const exported = parseExportedBuild(data);
        importBuildAsSlot(
          exported.build,
          exported.name,
          exported.milestones,
          exported.defaultVariantName,
        );
        showSuccess(labels.importedAsNew, "file");
      }
    } catch (error) {
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : allLabels.errors.invalidBuildCode,
        context: "file",
      });
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setFileDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleImportFile(file);
  };

  const handleBuildDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      reorderSavedBuildSlot(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearBuildDrag = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleExportLibrary = () => {
    downloadBackupFile(LIBRARY_BACKUP_FILENAME, createExportedLibrary(savedBuilds, modpackVersion));
  };

  const handleExportActive = () => {
    const entry = activeBuild ? normalizeSavedBuild(activeBuild) : null;
    const name = entry?.name ?? "build";
    downloadBackupFile(
      buildBackupFilename(name),
      createExportedBuild(
        name,
        entry?.build ?? build,
        modpackVersion,
        entry?.milestones ?? [],
        entry ? getDefaultVariantName(entry) : undefined,
      ),
    );
  };

  const flashActiveCopy = (action: "code" | "link") => {
    setActiveCodeCopied(action);
    setTimeout(() => setActiveCodeCopied(null), 2000);
  };

  const handleCopyActiveCode = async () => {
    await copyText(activeBuildCode);
    flashActiveCopy("code");
  };

  const handleCopyActiveLink = async () => {
    await copyText(buildShareUrl(activeBuildCode));
    flashActiveCopy("link");
  };

  return (
    <div
      className={cn(
        "page-scroll-with-fab mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:gap-5 lg:overflow-hidden lg:py-4",
        mobileTab === "transfer" ? "max-lg:overflow-hidden" : "overflow-y-auto",
      )}
    >
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-muted)]">
            {labels.eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-wide text-[var(--color-foreground)] sm:text-3xl">
            {labels.title}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            {formatLabel(labels.buildCount, { count: savedBuilds.length })} · {labels.autoSaveHint}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto sm:self-start">
          <Link to="/planner">
            {labels.openPlanner}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div
        className={cn(
          "flex flex-col gap-3",
          mobileTab === "transfer" && "min-h-0 flex-1 overflow-hidden max-lg:overflow-hidden",
          "lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch lg:gap-6 lg:overflow-hidden",
        )}
      >
        <div className="grid h-10 shrink-0 grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-0.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("builds")}
            className={cn(
              "rounded-[var(--radius-md)] px-3 text-xs font-medium transition-colors sm:text-sm",
              mobileTab === "builds"
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm"
                : "text-[var(--color-muted)]",
            )}
          >
            {labels.savedBuildsTitle}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("transfer")}
            className={cn(
              "rounded-[var(--radius-md)] px-3 text-xs font-medium transition-colors sm:text-sm",
              mobileTab === "transfer"
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-sm"
                : "text-[var(--color-muted)]",
            )}
          >
            {labels.shareCodeTitle}
          </button>
        </div>

        <section
          className={cn(
            "flex min-w-0 flex-col gap-3",
            mobileTab !== "builds" && "hidden lg:flex",
            "lg:min-h-0 lg:h-full lg:overflow-hidden",
          )}
        >
          <div className="flex shrink-0 items-center justify-end gap-3 lg:justify-between">
            <h2 className="hidden font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)] lg:block">
              {labels.savedBuildsTitle}
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-2.5 text-xs border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-surface-elevated)]"
              onClick={() => createSavedBuildSlot()}
            >
              <Plus className="h-3 w-3 text-[var(--color-accent)]" />
              {labels.newBuild}
            </Button>
          </div>

          <PickerSearchInput
            value={buildSearchQuery}
            onChange={setBuildSearchQuery}
            placeholder={labels.searchBuilds}
          />

          <div className="overflow-y-auto lg:min-h-0 lg:flex-1 lg:pr-1">
            {visibleBuilds.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-[var(--color-muted)]">
                {labels.noSearchResults}
              </p>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20">
                {visibleBuilds.map(({ entry, index }, displayIndex) => (
                  <div
                    key={entry.id}
                    className={cn(displayIndex > 0 && "border-t border-[var(--color-border)]/50")}
                  >
                    <SavedBuildCard
                      index={index}
                      entry={entry}
                      isActive={entry.id === activeBuildId}
                      isDragging={draggedIndex === index}
                      isDragOver={dragOverIndex === index && draggedIndex !== index}
                      canReorder={savedBuilds.length > 1 && !isFilteringBuilds}
                      canDelete={savedBuilds.length > 1}
                      labels={labels}
                      milestoneLabels={milestoneLabels}
                      game={gameData.game}
                      onSelect={() => selectSavedBuildSlot(entry.id)}
                      onDragStart={() => setDraggedIndex(index)}
                      onDragEnd={clearBuildDrag}
                      onDragOverItem={() => setDragOverIndex(index)}
                      onDropItem={(fromIndex) => handleBuildDrop(fromIndex, index)}
                      onRename={(name) => renameSavedBuildSlot(entry.id, name)}
                      onDelete={() => deleteSavedBuildSlot(entry.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside
          className={cn(
            "min-h-0 min-w-0 overflow-y-auto overscroll-y-contain pr-1",
            mobileTab !== "transfer" && "hidden lg:block",
            mobileTab === "transfer" && "flex-1 lg:flex-none",
          )}
        >
          <TransferSidebar
            labels={labels}
            activeBuildName={activeBuild?.name}
            activeBuildCode={activeBuildCode}
            codeInput={codeInput}
            onCodeInputChange={(value) => {
              setCodeInput(value);
              if (importFeedback?.context === "code") {
                setImportFeedback(null);
              }
            }}
            onImportCode={handleImportCode}
            onCopyActiveCode={handleCopyActiveCode}
            onCopyActiveLink={handleCopyActiveLink}
            activeCodeCopied={activeCodeCopied}
            importFeedback={importFeedback}
            fileInputRef={fileInputRef}
            fileDragOver={fileDragOver}
            onFileDragOver={(e) => {
              e.preventDefault();
              setFileDragOver(true);
            }}
            onFileDragLeave={() => setFileDragOver(false)}
            onFileDrop={handleFileDrop}
            onFileSelect={(file) => void handleImportFile(file)}
            onExportActive={handleExportActive}
            onExportLibrary={handleExportLibrary}
          />
        </aside>
      </div>
      <BugReportButton />
    </div>
  );
}
