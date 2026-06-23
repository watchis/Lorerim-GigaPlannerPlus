import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { FlipHorizontal, FlipVertical, Link2, Move, Plus, Shuffle, Trash2, Unlink } from "lucide-react";
import { CreatePerkNodeModal } from "./CreatePerkNodeModal";
import { CursorTooltip } from "@/ui/tooltip";
import { computePerkTreeEdges } from "@/lib/perkTreeEdges";
import {
  expandPerkIdsToStacks,
  getLayoutPerkNodes,
  sortPerkStack,
  type LayoutPerkNode,
} from "@/lib/perkStacks";
import type { PerkPrerequisiteKind, PerkTreeLike as PerkTreeEdgeInput } from "@/lib/perkTreeEdges";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

const MIN_GRID_SIZE = 15;
const STANDARD_GRID_ROWS = 34;
const DEFAULT_CELL_SIZE = 32;
const DRAG_THRESHOLD_PX = 4;

type LayoutMode = "position" | "link" | "unlink";

type PerkNodeLike = {
  id?: unknown;
  name?: unknown;
  skillReq?: unknown;
  playerLevelReq?: unknown;
  description?: unknown;
  prerequisites?: unknown;
  prerequisitesAny?: unknown;
  position?: { x?: unknown; y?: unknown };
};

type PerkTreeDocument = {
  skillId?: unknown;
  skillName?: unknown;
  grid?: { width?: unknown; height?: unknown; minX?: unknown; minY?: unknown };
  perks?: PerkNodeLike[];
};

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

function asPerkTree(
  value: unknown,
): { ok: true; tree: Required<Pick<PerkTreeDocument, "grid" | "perks">> & PerkTreeDocument } | { ok: false } {
  if (!value || typeof value !== "object") return { ok: false };
  const tree = value as PerkTreeDocument;
  const width = tree.grid && (tree.grid as { width?: unknown }).width;
  const height = tree.grid && (tree.grid as { height?: unknown }).height;
  if (!isFiniteInt(width) || !isFiniteInt(height)) return { ok: false };
  if (!Array.isArray(tree.perks)) return { ok: false };
  for (const perk of tree.perks) {
    if (!perk || typeof perk !== "object") return { ok: false };
    if (typeof perk.id !== "string") return { ok: false };
    const pos = perk.position;
    if (!pos || typeof pos !== "object") return { ok: false };
    if (!isFiniteInt(pos.x) || !isFiniteInt(pos.y)) return { ok: false };
  }
  return { ok: true, tree: tree as Required<Pick<PerkTreeDocument, "grid" | "perks">> & PerkTreeDocument };
}

type PerkTreeFrame = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

function getPerkTreeFrame(tree: PerkTreeDocument): PerkTreeFrame {
  const perks = tree.perks ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const perk of perks) {
    const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
    const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, width: MIN_GRID_SIZE, height: MIN_GRID_SIZE };
  }

  return {
    minX,
    minY,
    width: Math.max(MIN_GRID_SIZE, maxX - minX + 1),
    height: Math.max(MIN_GRID_SIZE, maxY - minY + 1),
  };
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeViewportGrid(viewportSize: { width: number; height: number }) {
  const visibleRows = STANDARD_GRID_ROWS;
  const cellSize =
    viewportSize.height > 0 ? viewportSize.height / visibleRows : DEFAULT_CELL_SIZE;
  const visibleColumns =
    viewportSize.width > 0
      ? Math.max(1, Math.floor(viewportSize.width / cellSize))
      : MIN_GRID_SIZE;
  const nodeSize = Math.max(14, cellSize * 0.65);

  return {
    visibleColumns,
    visibleRows,
    cellSize,
    metrics: {
      cellWidth: cellSize,
      cellHeight: cellSize,
      nodeSize,
    } satisfies GridMetrics,
    canvasWidth: visibleColumns * cellSize,
    canvasHeight: viewportSize.height > 0 ? viewportSize.height : visibleRows * cellSize,
  };
}

function fitPerksToVisibleGrid(
  tree: PerkTreeDocument,
  visibleColumns: number,
  visibleRows: number,
): PerkTreeDocument | null {
  const perks = tree.perks ?? [];
  if (perks.length === 0) return null;

  const maxX = visibleColumns - 1;
  const maxY = visibleRows - 1;

  let changed = false;
  const nextTree = structuredClone(tree);

  for (const perk of nextTree.perks ?? []) {
    const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
    const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;
    const clampedX = clampInt(x, 0, maxX);
    const clampedY = clampInt(y, 0, maxY);

    if (clampedX !== x || clampedY !== y) {
      perk.position = { x: clampedX, y: clampedY };
      changed = true;
    }
  }

  return changed ? nextTree : null;
}

function applyViewportFit(
  source: unknown,
  viewportSize: { width: number; height: number },
): unknown {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) return source;
  const { visibleColumns, visibleRows } = computeViewportGrid(viewportSize);
  const parsed = asPerkTree(source);
  if (!parsed.ok) return source;
  return fitPerksToVisibleGrid(parsed.tree, visibleColumns, visibleRows) ?? parsed.tree;
}

function buildDisplayFrame(visibleColumns: number, visibleRows: number): PerkTreeFrame {
  return {
    minX: 0,
    minY: 0,
    width: visibleColumns,
    height: visibleRows,
  };
}

type GridMetrics = {
  cellWidth: number;
  cellHeight: number;
  nodeSize: number;
};

function cellPosition(relX: number, relY: number, metrics: GridMetrics) {
  const insetX = (metrics.cellWidth - metrics.nodeSize) / 2;
  const insetY = (metrics.cellHeight - metrics.nodeSize) / 2;
  return {
    left: relX * metrics.cellWidth + insetX,
    top: relY * metrics.cellHeight + insetY,
  };
}

function positionFromPixels(left: number, top: number, frame: PerkTreeFrame, metrics: GridMetrics) {
  const centerX = left + metrics.nodeSize / 2;
  const centerY = top + metrics.nodeSize / 2;
  const relX = clampInt(Math.floor(centerX / metrics.cellWidth), 0, frame.width - 1);
  const relY = clampInt(Math.floor(centerY / metrics.cellHeight), 0, frame.height - 1);
  return {
    x: frame.minX + relX,
    y: frame.minY + relY,
  };
}

function perkLabel(perk: PerkNodeLike): string {
  return typeof perk.name === "string" ? perk.name : String(perk.id ?? "Unknown");
}

function defaultNewPerkPosition(
  perks: PerkNodeLike[],
  frame: PerkTreeFrame,
): { x: number; y: number } {
  const occupied = new Set(
    perks.map((perk) => {
      const x = isFiniteInt(perk.position?.x) ? perk.position!.x : -1;
      const y = isFiniteInt(perk.position?.y) ? perk.position!.y : -1;
      return `${x},${y}`;
    }),
  );

  for (let relY = 0; relY < frame.height; relY += 1) {
    for (let relX = 0; relX < frame.width; relX += 1) {
      const x = frame.minX + relX;
      const y = frame.minY + relY;
      if (!occupied.has(`${x},${y}`)) return { x, y };
    }
  }

  return {
    x: frame.minX + Math.floor(frame.width / 2),
    y: frame.minY + Math.floor(frame.height / 2),
  };
}

function addPrerequisite(
  perk: PerkNodeLike,
  prereqId: string,
  kind: PerkPrerequisiteKind,
): boolean {
  if (String(perk.id) === prereqId) return false;

  const field = kind === "any" ? "prerequisitesAny" : "prerequisites";
  const otherField = kind === "any" ? "prerequisites" : "prerequisitesAny";
  const current = asStringArray(perk[field]);
  if (current.includes(prereqId)) return false;

  const other = asStringArray(perk[otherField]);
  if (other.includes(prereqId)) return false;

  perk[field] = [...current, prereqId];
  return true;
}

function getPrerequisiteKind(
  perk: PerkNodeLike,
  prereqId: string,
): PerkPrerequisiteKind | null {
  if (asStringArray(perk.prerequisites).includes(prereqId)) return "all";
  if (asStringArray(perk.prerequisitesAny).includes(prereqId)) return "any";
  return null;
}

function setPrerequisiteKind(
  perk: PerkNodeLike,
  prereqId: string,
  kind: PerkPrerequisiteKind,
): boolean {
  const current = getPrerequisiteKind(perk, prereqId);
  if (current === kind) return false;
  if (current) removePrerequisite(perk, prereqId);
  return addPrerequisite(perk, prereqId, kind);
}

function togglePrerequisiteKind(perk: PerkNodeLike, prereqId: string): boolean {
  const current = getPrerequisiteKind(perk, prereqId);
  if (!current) return false;
  return setPrerequisiteKind(perk, prereqId, current === "all" ? "any" : "all");
}

function perkCenterPixels(perk: PerkNodeLike, frame: PerkTreeFrame, metrics: GridMetrics) {
  const x = isFiniteInt(perk.position?.x) ? perk.position!.x : 0;
  const y = isFiniteInt(perk.position?.y) ? perk.position!.y : 0;
  const { left, top } = cellPosition(x - frame.minX, y - frame.minY, metrics);
  return { x: left + metrics.nodeSize / 2, y: top + metrics.nodeSize / 2 };
}

function findLayoutNodeAtPoint(
  layoutNodes: LayoutPerkNode[],
  frame: PerkTreeFrame,
  metrics: GridMetrics,
  pointX: number,
  pointY: number,
  hitPadding = 2,
): LayoutPerkNode | null {
  const hitRadius = metrics.nodeSize / 2 + hitPadding;

  for (const node of layoutNodes) {
    const center = perkCenterPixels(node.perk, frame, metrics);
    const distance = Math.hypot(center.x - pointX, center.y - pointY);
    if (distance <= hitRadius) return node;
  }

  return null;
}

function findLayoutStackIdsInRect(
  layoutNodes: LayoutPerkNode[],
  frame: PerkTreeFrame,
  metrics: GridMetrics,
  rect: PixelRect,
): string[] {
  const ids: string[] = [];
  for (const node of layoutNodes) {
    if (pixelRectsOverlap(rect, perkNodePixelRect(node.perk, frame, metrics))) {
      ids.push(...node.stackIds);
    }
  }
  return ids;
}

function PerkTooltipContent({ stack, perks }: { stack: PerkNodeLike[]; perks: PerkNodeLike[] }) {
  const ranks = sortPerkStack(stack);
  const labelById = new Map(perks.map((p) => [String(p.id), perkLabel(p)]));

  return (
    <div className="space-y-0 text-xs">
      {ranks.map((perk, index) => {
        const name = perkLabel(perk);
        const skillReq = isFiniteInt(perk.skillReq) ? perk.skillReq : null;
        const playerLevelReq = isFiniteInt(perk.playerLevelReq) ? perk.playerLevelReq : null;
        const description =
          typeof perk.description === "string" ? stripHtml(perk.description) : "No description";
        const prereqAll = asStringArray(perk.prerequisites);
        const prereqAny = asStringArray(perk.prerequisitesAny);

        return (
          <div key={String(perk.id)}>
            {index > 0 && (
              <div
                className="my-2 border-t border-[var(--color-border)]"
                role="separator"
                aria-hidden
              />
            )}
            <div className="space-y-1">
              {ranks.length > 1 && (
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Rank {index + 1} of {ranks.length}
                </p>
              )}
              <p className="font-semibold text-[var(--color-foreground)]">{name}</p>
              <p className="text-[var(--color-muted)]">
                {skillReq !== null && <span>Skill level {skillReq}</span>}
                {skillReq !== null && playerLevelReq !== null && <span> · </span>}
                {playerLevelReq !== null && <span>Player level {playerLevelReq}</span>}
                {skillReq === null && playerLevelReq === null && <span>Level unknown</span>}
              </p>
              {(prereqAll.length > 0 || prereqAny.length > 0) && (
                <div className="space-y-0.5 text-[var(--color-muted)]">
                  {prereqAll.length > 0 && (
                    <p>
                      Requires:{" "}
                      {prereqAll.map((id) => labelById.get(id) ?? id).join(", ")}
                    </p>
                  )}
                  {prereqAny.length > 0 && (
                    <p>
                      Requires any:{" "}
                      {prereqAny.map((id) => labelById.get(id) ?? id).join(", ")}
                    </p>
                  )}
                </div>
              )}
              <p className="max-w-xs whitespace-pre-wrap text-[var(--color-foreground)]/90">
                {description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PixelRect = { left: number; top: number; right: number; bottom: number };

function normalizePixelRect(x1: number, y1: number, x2: number, y2: number): PixelRect {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    right: Math.max(x1, x2),
    bottom: Math.max(y1, y2),
  };
}

function pixelRectsOverlap(a: PixelRect, b: PixelRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function perkNodePixelRect(perk: PerkNodeLike, frame: PerkTreeFrame, metrics: GridMetrics): PixelRect {
  const x = isFiniteInt(perk.position?.x) ? perk.position!.x : 0;
  const y = isFiniteInt(perk.position?.y) ? perk.position!.y : 0;
  const { left, top } = cellPosition(x - frame.minX, y - frame.minY, metrics);
  return { left, top, right: left + metrics.nodeSize, bottom: top + metrics.nodeSize };
}

function removePrerequisite(perk: PerkNodeLike, prereqId: string): boolean {
  const all = asStringArray(perk.prerequisites);
  const any = asStringArray(perk.prerequisitesAny);
  const nextAll = all.filter((id) => id !== prereqId);
  const nextAny = any.filter((id) => id !== prereqId);
  if (nextAll.length === all.length && nextAny.length === any.length) return false;

  perk.prerequisites = nextAll;
  perk.prerequisitesAny = nextAny;
  return true;
}

function removePerkFromTree(tree: PerkTreeDocument, perkId: string): PerkTreeDocument {
  const nextTree = structuredClone(tree);
  const perks = nextTree.perks ?? [];
  nextTree.perks = perks.filter((perk) => perk.id !== perkId);
  for (const perk of nextTree.perks) {
    removePrerequisite(perk, perkId);
  }
  return nextTree;
}

function removePerksFromTree(tree: PerkTreeDocument, perkIds: Iterable<string>): PerkTreeDocument {
  let nextTree = tree;
  for (const perkId of perkIds) {
    nextTree = removePerkFromTree(nextTree, perkId);
  }
  return nextTree;
}

function unlinkAllFromSelectedNodes(tree: PerkTreeDocument, selectedIds: Set<string>): boolean {
  if (selectedIds.size === 0) return false;

  let changed = false;

  for (const perk of tree.perks ?? []) {
    if (selectedIds.has(String(perk.id))) {
      if (asStringArray(perk.prerequisites).length > 0 || asStringArray(perk.prerequisitesAny).length > 0) {
        perk.prerequisites = [];
        perk.prerequisitesAny = [];
        changed = true;
      }
      continue;
    }

    const all = asStringArray(perk.prerequisites);
    const any = asStringArray(perk.prerequisitesAny);
    const nextAll = all.filter((id) => !selectedIds.has(id));
    const nextAny = any.filter((id) => !selectedIds.has(id));
    if (nextAll.length !== all.length || nextAny.length !== any.length) {
      perk.prerequisites = nextAll;
      perk.prerequisitesAny = nextAny;
      changed = true;
    }
  }

  return changed;
}

function perkLevelRequirement(perk: PerkNodeLike): number {
  if (isFiniteInt(perk.skillReq)) return perk.skillReq;
  if (isFiniteInt(perk.playerLevelReq)) return perk.playerLevelReq;
  return 0;
}

function levelToRelativeRow(
  level: number,
  minLevel: number,
  maxLevel: number,
  height: number,
): number {
  if (height <= 1) return 0;
  if (maxLevel === minLevel) return Math.floor(Math.random() * height);
  return Math.round(((level - minLevel) / (maxLevel - minLevel)) * (height - 1));
}

function spreadPerksInTree(tree: PerkTreeDocument, displayFrame: PerkTreeFrame): PerkTreeDocument {
  const nextTree = structuredClone(tree);
  const perks = nextTree.perks ?? [];
  if (perks.length === 0) return nextTree;

  const width = displayFrame.width;
  const height = displayFrame.height;

  const levels = perks.map(perkLevelRequirement);
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);
  const occupied = new Set<string>();
  const shuffledPerks = [...perks].sort(() => Math.random() - 0.5);

  for (const perk of shuffledPerks) {
    const relTargetY = levelToRelativeRow(perkLevelRequirement(perk), minLevel, maxLevel, height);
    let assigned: { x: number; y: number } | null = null;

    for (let radius = 0; radius < height; radius += 1) {
      const rows: number[] = [];
      if (radius === 0) {
        rows.push(relTargetY);
      } else {
        const above = relTargetY - radius;
        const below = relTargetY + radius;
        if (above >= 0) rows.push(above);
        if (below < height) rows.push(below);
      }

      const candidates: { x: number; y: number }[] = [];
      for (const relY of rows) {
        for (let relX = 0; relX < width; relX += 1) {
          const key = `${relX},${relY}`;
          if (!occupied.has(key)) candidates.push({ x: relX, y: relY });
        }
      }

      if (candidates.length > 0) {
        assigned = candidates[Math.floor(Math.random() * candidates.length)];
        break;
      }
    }

    if (!assigned) continue;

    occupied.add(`${assigned.x},${assigned.y}`);
    perk.position = {
      x: displayFrame.minX + assigned.x,
      y: displayFrame.minY + assigned.y,
    };
  }

  return nextTree;
}

function flipPerkPositions(
  tree: PerkTreeDocument,
  axis: "horizontal" | "vertical",
): PerkTreeDocument {
  const nextTree = structuredClone(tree);
  const perks = nextTree.perks ?? [];
  if (perks.length === 0) return nextTree;

  const layoutFrame = getPerkTreeFrame(nextTree);

  for (const perk of perks) {
    const x = isFiniteInt(perk.position?.x) ? perk.position.x : 0;
    const y = isFiniteInt(perk.position?.y) ? perk.position.y : 0;

    if (axis === "horizontal") {
      const relX = x - layoutFrame.minX;
      perk.position = {
        x: layoutFrame.minX + (layoutFrame.width - 1 - relX),
        y,
      };
    } else {
      const relY = y - layoutFrame.minY;
      perk.position = {
        x,
        y: layoutFrame.minY + (layoutFrame.height - 1 - relY),
      };
    }
  }

  return nextTree;
}


function toEdgeTree(tree: PerkTreeDocument): PerkTreeEdgeInput {
  return {
    perks: (tree.perks ?? []).map((perk) => ({
      id: String(perk.id),
      position: {
        x: isFiniteInt(perk.position?.x) ? perk.position.x : 0,
        y: isFiniteInt(perk.position?.y) ? perk.position.y : 0,
      },
      prerequisites: asStringArray(perk.prerequisites),
      prerequisitesAny: asStringArray(perk.prerequisitesAny),
    })),
  };
}

function renamePrerequisiteId(
  perks: PerkNodeLike[],
  oldId: string,
  newId: string,
): void {
  for (const perk of perks) {
    const all = asStringArray(perk.prerequisites);
    const nextAll = all.map((id) => (id === oldId ? newId : id));
    if (nextAll.some((id, index) => id !== all[index])) {
      perk.prerequisites = nextAll;
    }

    const any = asStringArray(perk.prerequisitesAny);
    const nextAny = any.map((id) => (id === oldId ? newId : id));
    if (nextAny.some((id, index) => id !== any[index])) {
      perk.prerequisitesAny = nextAny;
    }
  }
}

function PerkCircleNode({
  perk,
  stack,
  perks,
  layoutMode,
  isLinkSource,
  isSelected,
  isDragging,
  onPointerDown,
  onDoubleClick,
  frame,
  metrics,
}: {
  perk: PerkNodeLike;
  stack: PerkNodeLike[];
  perks: PerkNodeLike[];
  layoutMode: LayoutMode;
  isLinkSource: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: MouseEvent<HTMLDivElement>) => void;
  frame: PerkTreeFrame;
  metrics: GridMetrics;
}) {
  const x = isFiniteInt(perk.position?.x) ? perk.position!.x : 0;
  const y = isFiniteInt(perk.position?.y) ? perk.position!.y : 0;
  const { left, top } = cellPosition(x - frame.minX, y - frame.minY, metrics);
  const skillReq = isFiniteInt(perk.skillReq) ? perk.skillReq : null;
  const fontSize = Math.max(8, Math.min(12, metrics.nodeSize * 0.45));
  const rankBadge = stack.length > 1 ? `${stack.length}` : null;
  const ariaName =
    stack.length > 1
      ? `${perkLabel(perk)} (${stack.length} ranks)`
      : perkLabel(perk);

  return (
    <CursorTooltip content={<PerkTooltipContent stack={stack} perks={perks} />}>
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaName}
        className={cn(
          "absolute flex items-center justify-center rounded-full border-2 bg-[var(--color-surface-elevated)] font-semibold text-[var(--color-foreground)] shadow-[var(--shadow-glow)] transition-colors",
          layoutMode === "position"
            ? isDragging
              ? "z-10 cursor-grabbing border-[var(--color-accent)] bg-[var(--color-accent)]/20"
              : "cursor-grab border-[var(--color-border)] hover:border-[var(--color-accent-muted)]"
            : layoutMode === "link"
              ? isLinkSource
                ? "z-40 cursor-crosshair border-[var(--color-accent)] bg-[var(--color-accent)]/25 ring-2 ring-[var(--color-accent)]/40"
                : "z-30 cursor-crosshair border-[var(--color-border)] hover:border-[var(--color-accent-muted)]"
              : "cursor-pointer",
          layoutMode === "unlink" && "z-30",
          layoutMode === "unlink" &&
            "border-[var(--color-border)] hover:border-[var(--color-accent-muted)]",
          (layoutMode === "position" || layoutMode === "unlink") &&
            isSelected &&
            !isDragging &&
            "z-10 border-[var(--color-error)] bg-[var(--color-error)]/15 ring-2 ring-[var(--color-error)]/35",
        )}
        style={{
          left,
          top,
          width: metrics.nodeSize,
          height: metrics.nodeSize,
          fontSize,
        }}
        onPointerDown={(event) => {
          if (layoutMode === "position") {
            onPointerDown(event);
          }
        }}
        onDoubleClick={onDoubleClick}
      >
        {rankBadge ? (
          <span className="flex flex-col items-center leading-none">
            <span>{skillReq !== null ? skillReq : "·"}</span>
            <span className="text-[8px] font-medium text-[var(--color-muted)]">×{rankBadge}</span>
          </span>
        ) : (
          skillReq !== null ? skillReq : "·"
        )}
      </div>
    </CursorTooltip>
  );
}

export function PerkTreeLayoutEditor({
  value,
  onCommit,
}: {
  value: unknown;
  onCommit: (nextValue: unknown) => void;
}) {
  const parsed = useMemo(() => asPerkTree(value), [value]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const [draft, setDraft] = useState<unknown>(value);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("position");
  const [linkKind, setLinkKind] = useState<PerkPrerequisiteKind>("all");
  const [linkDragging, setLinkDragging] = useState<null | {
    sourcePerkId: string;
    pointerX: number;
    pointerY: number;
  }>(null);
  const [dragging, setDragging] = useState<null | {
    perkId: string;
    perkIds: string[];
    primaryStackIds: string[];
    startPositions: Map<string, { x: number; y: number }>;
    offsetX: number;
    offsetY: number;
  }>(null);
  const [pendingDrag, setPendingDrag] = useState<null | {
    perkId: string;
    perkIds: string[];
    primaryStackIds: string[];
    startPositions: Map<string, { x: number; y: number }>;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
    pointerId: number;
  }>(null);
  const [selectedPerkIds, setSelectedPerkIds] = useState<Set<string>>(() => new Set());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const pendingDragRef = useRef(pendingDrag);
  pendingDragRef.current = pendingDrag;
  const linkDraggingRef = useRef(linkDragging);
  linkDraggingRef.current = linkDragging;
  const skipSelectionResetOnValueSyncRef = useRef(false);
  const [marquee, setMarquee] = useState<null | {
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
  }>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStackIds, setEditingStackIds] = useState<string[] | null>(null);

  useEffect(() => {
    const fitted =
      viewportSize.width > 0 && viewportSize.height > 0
        ? applyViewportFit(value, viewportSize)
        : value;
    const skipUiReset = skipSelectionResetOnValueSyncRef.current;
    skipSelectionResetOnValueSyncRef.current = false;

    setDraft(fitted);
    setDragging(null);
    setPendingDrag(null);
    setLinkDragging(null);
    setMarquee(null);

    if (!skipUiReset) {
      setSelectedPerkIds(new Set());
      setCreateModalOpen(false);
      setEditingStackIds(null);
    }

    if (viewportSize.width > 0 && viewportSize.height > 0 && fitted !== value) {
      const original = asPerkTree(value);
      const next = asPerkTree(fitted);
      if (original.ok && next.ok) {
        skipSelectionResetOnValueSyncRef.current = true;
        onCommit(fitted);
      }
    }
  }, [value, onCommit]);

  useEffect(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;

    setDraft((current: unknown) => {
      const fitted = applyViewportFit(current, viewportSize);
      if (fitted === current) return current;
      skipSelectionResetOnValueSyncRef.current = true;
      onCommit(fitted);
      return fitted;
    });
  }, [viewportSize.width, viewportSize.height, onCommit]);

  useEffect(() => {
    setLinkDragging(null);
  }, [layoutMode, linkKind]);

  useEffect(() => {
    if (selectedPerkIds.size > 1 && layoutMode === "link") {
      setLayoutMode("position");
    }
  }, [selectedPerkIds.size, layoutMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        linkDraggingRef.current = null;
        setLinkDragging(null);
        setMarquee(null);
        setSelectedPerkIds(new Set());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const draftParsed = useMemo(() => asPerkTree(draft), [draft]);
  const renderTree = useMemo(() => {
    if (!parsed.ok) return null;
    return draftParsed.ok ? draftParsed.tree : parsed.tree;
  }, [parsed, draftParsed]);

  const contentFrame = useMemo(
    () => (renderTree ? getPerkTreeFrame(renderTree) : null),
    [renderTree],
  );

  const gridLayout = useMemo(() => computeViewportGrid(viewportSize), [viewportSize]);

  const { metrics, visibleColumns, visibleRows, canvasWidth, canvasHeight } = gridLayout;

  const displayFrame = useMemo(
    () => buildDisplayFrame(visibleColumns, visibleRows),
    [visibleColumns, visibleRows],
  );

  const nodeRadiusGrid = metrics.nodeSize / (2 * metrics.cellWidth);
  const edges = useMemo(() => {
    if (!renderTree) return [];
    return computePerkTreeEdges(toEdgeTree(renderTree), nodeRadiusGrid);
  }, [renderTree, nodeRadiusGrid]);

  if (!parsed.ok || !renderTree || !displayFrame) {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs text-[var(--color-muted)]">
        This file doesn&apos;t look like a perk tree (missing `grid`/`perks`/`position`).
      </div>
    );
  }

  const tree = renderTree;
  const perks = tree.perks;
  const layoutNodes = useMemo(() => getLayoutPerkNodes(perks), [perks]);

  const commitTree = (nextTree: PerkTreeDocument) => {
    setDraft(nextTree);
    skipSelectionResetOnValueSyncRef.current = true;
    onCommit(nextTree);
  };

  const handleSpreadOut = () => {
    commitTree(spreadPerksInTree(tree, displayFrame));
    setSelectedPerkIds(new Set());
    setLinkDragging(null);
  };

  const handleFlip = (axis: "horizontal" | "vertical") => {
    commitTree(flipPerkPositions(tree, axis));
    setLinkDragging(null);
  };

  const handleCreatePerk = (perk: Record<string, unknown>) => {
    const nextTree = structuredClone(tree);
    nextTree.perks = [...nextTree.perks, perk as PerkNodeLike];
    commitTree(nextTree);
    setCreateModalOpen(false);
  };


  const handleUpdateStack = (
    updates: Array<{ originalId: string; perk: Record<string, unknown> }>,
  ) => {
    const nextTree = structuredClone(tree);
    const perksList = nextTree.perks ?? [];
    const nextSelected = new Set(selectedPerkIds);

    for (const { originalId, perk } of updates) {
      const index = perksList.findIndex((node) => node.id === originalId);
      if (index < 0) continue;

      const nextId = String(perk.id);
      if (nextId !== originalId) {
        renamePrerequisiteId(perksList, originalId, nextId);
        if (nextSelected.has(originalId)) {
          nextSelected.delete(originalId);
          nextSelected.add(nextId);
        }
      }

      perksList[index] = perk as PerkNodeLike;
    }

    commitTree(nextTree);
    setEditingStackIds(null);
    setSelectedPerkIds(nextSelected);
  };

  const handleRemoveSelectedPerks = () => {
    if (selectedPerkIds.size === 0) return;

    const ids = expandPerkIdsToStacks(selectedPerkIds, perks);
    const labels = ids.map((id) =>
      perkLabel(perks.find((p) => p.id === id) ?? { id }),
    );
    const summary =
      ids.length === 1
        ? `"${labels[0]}"`
        : `${ids.length} nodes:\n${labels.map((label) => `• ${label}`).join("\n")}`;

    const confirmed = window.confirm(
      `Remove ${summary}?\n\nThis deletes the node(s) and removes links to them from other perks.`,
    );
    if (!confirmed) return;

    commitTree(removePerksFromTree(tree, ids));
    setSelectedPerkIds(new Set());
    setLinkDragging(null);
  };

  const skillId = typeof tree.skillId === "string" ? tree.skillId : "perk";
  const newPerkPosition = defaultNewPerkPosition(perks, displayFrame);

  const commitPositions = (positions: Map<string, { x: number; y: number }>) => {
    if (positions.size === 0) return;

    const parsed = asPerkTree(draftRef.current);
    if (!parsed.ok) return;

    const nextTree = structuredClone(parsed.tree);
    for (const [perkId, position] of positions) {
      const perk = nextTree.perks.find((p) => p.id === perkId);
      if (!perk) continue;
      perk.position = { ...perk.position, ...position };
    }
    commitTree(nextTree);
  };

  const applyPointerSelection = (
    primaryStackIds: string[],
    shiftKey: boolean,
  ) => {
    if (shiftKey) {
      setSelectedPerkIds((current) => {
        const next = new Set(current);
        const allSelected = primaryStackIds.every((id) => next.has(id));
        if (allSelected) {
          for (const id of primaryStackIds) next.delete(id);
        } else {
          for (const id of primaryStackIds) next.add(id);
        }
        return next;
      });
    } else {
      setSelectedPerkIds(new Set(primaryStackIds));
    }
  };

  const finishDrag = (shiftKey: boolean) => {
    const activeDrag = draggingRef.current;
    if (!activeDrag) return;
    draggingRef.current = null;
    setDragging(null);

    const currentParsed = asPerkTree(draftRef.current);
    if (!currentParsed.ok) return;

    const primaryStart = activeDrag.startPositions.get(activeDrag.perkId);
    if (!primaryStart) return;

    const currentPrimary = currentParsed.tree.perks.find((p) => p.id === activeDrag.perkId);
    if (!currentPrimary?.position) return;

    const nextX = currentPrimary.position.x as number;
    const nextY = currentPrimary.position.y as number;
    const deltaX = nextX - primaryStart.x;
    const deltaY = nextY - primaryStart.y;
    const moved = deltaX !== 0 || deltaY !== 0;

    if (!moved) {
      applyPointerSelection(activeDrag.primaryStackIds, shiftKey);
      return;
    }

    const positions = new Map<string, { x: number; y: number }>();
    for (const id of activeDrag.perkIds) {
      const start = activeDrag.startPositions.get(id);
      const node = currentParsed.tree.perks.find((p) => p.id === id);
      if (!start || !node?.position) continue;
      positions.set(id, {
        x: node.position.x as number,
        y: node.position.y as number,
      });
    }
    commitPositions(positions);
  };

  const beginDrag = (
    perkId: string,
    stackIds: string[],
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (layoutMode !== "position" || event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dragIds = expandPerkIdsToStacks(
      selectedPerkIds.has(perkId) && selectedPerkIds.size > 1 ? [...selectedPerkIds] : stackIds,
      perks,
    );
    const startPositions = new Map<string, { x: number; y: number }>();

    for (const id of dragIds) {
      const node = perks.find((p) => p.id === id);
      if (!node) continue;
      startPositions.set(id, {
        x: isFiniteInt(node.position?.x) ? node.position!.x : 0,
        y: isFiniteInt(node.position?.y) ? node.position!.y : 0,
      });
    }

    const nextPending = {
      perkId,
      perkIds: dragIds,
      primaryStackIds: stackIds,
      startPositions,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      pointerId: event.pointerId,
    };
    pendingDragRef.current = nextPending;
    setPendingDrag(nextPending);
  };

  const promotePendingDrag = (
    event: PointerEvent<HTMLDivElement>,
  ): boolean => {
    const pending = pendingDragRef.current;
    if (!pending || draggingRef.current) return false;

    const dx = event.clientX - pending.startClientX;
    const dy = event.clientY - pending.startClientY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return false;

    const nextDrag = {
      perkId: pending.perkId,
      perkIds: pending.perkIds,
      primaryStackIds: pending.primaryStackIds,
      startPositions: pending.startPositions,
      offsetX: pending.offsetX,
      offsetY: pending.offsetY,
    };
    pendingDragRef.current = null;
    setPendingDrag(null);
    draggingRef.current = nextDrag;
    setDragging(nextDrag);

    const container = containerRef.current;
    if (container) {
      container.setPointerCapture(pending.pointerId);
    }
    event.preventDefault();
    return true;
  };

  const handleDragPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (layoutMode !== "position") return;

    promotePendingDrag(event);

    const activeDrag = draggingRef.current;
    if (!activeDrag) return;

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const left = event.clientX - containerRect.left - activeDrag.offsetX;
    const top = event.clientY - containerRect.top - activeDrag.offsetY;
    const { x: nextX, y: nextY } = positionFromPixels(left, top, displayFrame, metrics);
    const primaryStart = activeDrag.startPositions.get(activeDrag.perkId);
    if (!primaryStart) return;

    const deltaX = nextX - primaryStart.x;
    const deltaY = nextY - primaryStart.y;
    const maxX = displayFrame.width - 1;
    const maxY = displayFrame.height - 1;

    setDraft((current: unknown) => {
      const currentParsed = asPerkTree(current);
      if (!currentParsed.ok) return current;
      const nextTree = structuredClone(currentParsed.tree);

      for (const id of activeDrag.perkIds) {
        const start = activeDrag.startPositions.get(id);
        if (!start) continue;
        const perkNode = nextTree.perks.find((p) => p.id === id);
        if (!perkNode) continue;
        perkNode.position = {
          x: clampInt(start.x + deltaX, 0, maxX),
          y: clampInt(start.y + deltaY, 0, maxY),
        };
      }

      draftRef.current = nextTree;
      return nextTree;
    });
  };

  const handleDragPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      finishDrag(event.shiftKey);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    const pending = pendingDragRef.current;
    if (!pending) return;

    pendingDragRef.current = null;
    setPendingDrag(null);
    applyPointerSelection(pending.primaryStackIds, event.shiftKey);
  };

  useEffect(() => {
    if (!dragging) return;

    const onWindowPointerEnd = () => finishDrag(false);
    window.addEventListener("pointerup", onWindowPointerEnd);
    window.addEventListener("pointercancel", onWindowPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerEnd);
      window.removeEventListener("pointercancel", onWindowPointerEnd);
    };
  }, [dragging]);

  const handleUnlinkSelected = () => {
    if (selectedPerkIds.size === 0) {
      setLayoutMode("unlink");
      return;
    }

    const nextTree = structuredClone(tree);
    if (!unlinkAllFromSelectedNodes(nextTree, selectedPerkIds)) {
      setLayoutMode("unlink");
      return;
    }

    commitTree(nextTree);
    setLinkDragging(null);
    setLayoutMode("unlink");
  };

  const handleUnlinkEdge = (dependentId: string, prerequisiteId: string) => {
    const nextTree = structuredClone(tree);
    const dependent = nextTree.perks.find((perk) => perk.id === dependentId);
    if (!dependent) return;
    if (!removePrerequisite(dependent, prerequisiteId)) return;
    commitTree(nextTree);
  };

  const handleToggleEdgeKind = (dependentId: string, prerequisiteId: string) => {
    const nextTree = structuredClone(tree);
    const dependent = nextTree.perks.find((perk) => perk.id === dependentId);
    if (!dependent) return;
    if (!togglePrerequisiteKind(dependent, prerequisiteId)) return;
    commitTree(nextTree);
  };

  const commitLink = (prerequisiteId: string, dependentId: string) => {
    if (prerequisiteId === dependentId) return;

    const prerequisitePerk = perks.find((perk) => perk.id === prerequisiteId);
    const dependentPerk = perks.find((perk) => perk.id === dependentId);
    if (!prerequisitePerk || !dependentPerk) return;

    const nextTree = structuredClone(tree);
    const dependent = nextTree.perks.find((perk) => perk.id === dependentId);
    if (!dependent) return;

    const existingKind = getPrerequisiteKind(dependent, prerequisiteId);
    if (existingKind) {
      if (existingKind === linkKind) return;
      setPrerequisiteKind(dependent, prerequisiteId, linkKind);
    } else if (!addPrerequisite(dependent, prerequisiteId, linkKind)) {
      return;
    }

    commitTree(nextTree);
  };

  const pointerPositionInContainer = (event: PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleLinkPointerDown = (perkId: string, event: PointerEvent<HTMLDivElement>) => {
    const point = pointerPositionInContainer(event);
    if (!point) return;

    const nextLink = {
      sourcePerkId: perkId,
      pointerX: point.x,
      pointerY: point.y,
    };
    linkDraggingRef.current = nextLink;
    setLinkDragging(nextLink);

    const container = containerRef.current;
    if (container) {
      container.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  };

  const handleLinkPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const activeLink = linkDraggingRef.current;
    if (!activeLink) return;

    const point = pointerPositionInContainer(event);
    if (!point) return;

    const nextLink = {
      sourcePerkId: activeLink.sourcePerkId,
      pointerX: point.x,
      pointerY: point.y,
    };
    linkDraggingRef.current = nextLink;
    setLinkDragging(nextLink);
  };

  const handleLinkPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const activeLink = linkDraggingRef.current;
    if (!activeLink) return;

    linkDraggingRef.current = null;
    setLinkDragging(null);

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;
    const targetNode = findLayoutNodeAtPoint(layoutNodes, displayFrame, metrics, pointX, pointY);

    if (targetNode && !targetNode.stackIds.includes(activeLink.sourcePerkId)) {
      commitLink(activeLink.sourcePerkId, targetNode.stackIds[0]);
    }

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
  };

  const linkDragSourcePerk = linkDragging
    ? perks.find((perk) => perk.id === linkDragging.sourcePerkId)
    : null;
  const linkDragSourceCenter = linkDragSourcePerk
    ? perkCenterPixels(linkDragSourcePerk, displayFrame, metrics)
    : null;

  const selectedPerkLabels = [...selectedPerkIds].map((id) =>
    perkLabel(perks.find((p) => p.id === id) ?? { id }),
  );

  const handleCanvasPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (layoutMode !== "link" || event.button !== 0 || linkDraggingRef.current) return;

    const point = pointerPositionInContainer(event);
    if (!point) return;

    const targetNode = findLayoutNodeAtPoint(
      layoutNodes,
      displayFrame,
      metrics,
      point.x,
      point.y,
      8,
    );
    if (!targetNode) return;

    handleLinkPointerDown(targetNode.stackIds[0], event);
    event.preventDefault();
  };

  const handleMarqueePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (layoutMode !== "position" || event.button !== 0) return;
    if (draggingRef.current || pendingDragRef.current) return;

    const point = pointerPositionInContainer(event);
    if (!point) return;
    if (findLayoutNodeAtPoint(layoutNodes, displayFrame, metrics, point.x, point.y)) return;

    setLinkDragging(null);
    setMarquee({
      startX: point.x,
      startY: point.y,
      pointerX: point.x,
      pointerY: point.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleMarqueePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!marquee) return;
    const point = pointerPositionInContainer(event);
    if (!point) return;

    setMarquee({
      ...marquee,
      pointerX: point.x,
      pointerY: point.y,
    });
  };

  const handleMarqueePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!marquee) return;

    const activeMarquee = marquee;
    setMarquee(null);

    const rect = normalizePixelRect(
      activeMarquee.startX,
      activeMarquee.startY,
      activeMarquee.pointerX,
      activeMarquee.pointerY,
    );
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const minDrag = 4;

    if (width < minDrag && height < minDrag) {
      if (!event.shiftKey) setSelectedPerkIds(new Set());
    } else {
      const ids = findLayoutStackIdsInRect(layoutNodes, displayFrame, metrics, rect);
      if (event.shiftKey) {
        setSelectedPerkIds((current) => {
          const next = new Set(current);
          for (const id of ids) next.add(id);
          return next;
        });
      } else {
        setSelectedPerkIds(new Set(ids));
      }
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const modeHelp =
    layoutMode === "position"
      ? "Drag circles to set perk positions. Click to select; Shift+click for multi-select. Double-click a node to edit it. Drag on empty space to marquee-select. Dragging moves all selected nodes."
      : layoutMode === "link"
        ? linkKind === "all"
          ? "Drag from prerequisite to dependent node. Click a line to toggle AND/OR."
          : "Drag from prerequisite to dependent node (OR). Click a line to toggle AND/OR."
        : selectedPerkIds.size > 0
          ? "Click Unlink to clear all links on selected nodes, or click a connection line to remove it."
          : "Click a connection line to remove that prerequisite link.";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-sm border border-[var(--color-border)] p-0.5">
          <Button
            type="button"
            variant={layoutMode === "position" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setLayoutMode("position")}
          >
            <Move className="size-3" />
            Position
          </Button>
          <Button
            type="button"
            variant={layoutMode === "link" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={selectedPerkIds.size > 1}
            onClick={() => setLayoutMode("link")}
          >
            <Link2 className="size-3" />
            Link
          </Button>
          <Button
            type="button"
            variant={layoutMode === "unlink" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleUnlinkSelected}
          >
            <Unlink className="size-3" />
            Unlink
          </Button>
        </div>

        {layoutMode === "link" && (
          <div className="flex items-center gap-1 rounded-sm border border-[var(--color-border)] p-0.5">
            <span className="px-1 text-xs text-[var(--color-muted)]">New links</span>
            <Button
              type="button"
              variant={linkKind === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setLinkKind("all")}
            >
              All (AND)
            </Button>
            <Button
              type="button"
              variant={linkKind === "any" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setLinkKind("any")}
            >
              Any (OR)
            </Button>
          </div>
        )}

        {linkDragging && layoutMode === "link" && (
          <span className="text-xs text-[var(--color-accent)]">
            Prerequisite: {perkLabel(linkDragSourcePerk ?? { id: linkDragging.sourcePerkId })} — drag to
            dependent
          </span>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          disabled={perks.length === 0}
          onClick={handleSpreadOut}
        >
          <Shuffle className="size-3" />
          Spread out
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          disabled={perks.length === 0}
          onClick={() => handleFlip("horizontal")}
        >
          <FlipHorizontal className="size-3" />
          Flip H
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          disabled={perks.length === 0}
          onClick={() => handleFlip("vertical")}
        >
          <FlipVertical className="size-3" />
          Flip V
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {selectedPerkIds.size > 0 && (layoutMode === "position" || layoutMode === "unlink") && (
            <span className="text-xs text-[var(--color-muted)]">
              Selected:{" "}
              {selectedPerkIds.size === 1
                ? selectedPerkLabels[0]
                : `${selectedPerkIds.size} nodes`}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-[var(--color-error)] hover:text-[var(--color-error)]"
            disabled={selectedPerkIds.size === 0}
            onClick={handleRemoveSelectedPerks}
          >
            <Trash2 className="size-3" />
            Remove {selectedPerkIds.size === 1 ? "node" : "nodes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="size-3" />
            Create node
          </Button>
        </div>
      </div>

      <div className="text-xs text-[var(--color-muted)]">
        {modeHelp} Hover for details. Perks span {contentFrame?.width ?? 0}×{contentFrame?.height ?? 0}
        {contentFrame && (contentFrame.minX !== 0 || contentFrame.minY !== 0) && (
          <span>
            {" "}
            (origin {contentFrame.minX},{contentFrame.minY})
          </span>
        )}
        . Viewport grid {visibleColumns}×{visibleRows}. Grid size is written to JSON when you save.
      </div>

      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-start justify-center overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div
          ref={containerRef}
          className="relative shrink-0 select-none"
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
          onPointerDown={handleMarqueePointerDown}
          onPointerDownCapture={handleCanvasPointerDownCapture}
          onPointerMove={(event) => {
            handleMarqueePointerMove(event);
            handleDragPointerMove(event);
            handleLinkPointerMove(event);
          }}
          onPointerUp={(event) => {
            handleMarqueePointerUp(event);
            handleDragPointerUp(event);
            handleLinkPointerUp(event);
          }}
          onLostPointerCapture={() => {
            if (draggingRef.current) finishDrag(false);
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden
          >
            {Array.from({ length: visibleColumns + 1 }, (_, column) => {
              const x = column * metrics.cellWidth;
              return (
                <line
                  key={`grid-v-${column}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={canvasHeight}
                  stroke="color-mix(in srgb, var(--color-border) 55%, transparent)"
                  strokeWidth={1}
                />
              );
            })}
            {Array.from({ length: visibleRows + 1 }, (_, row) => {
              const y = row * metrics.cellHeight;
              return (
                <line
                  key={`grid-h-${row}`}
                  x1={0}
                  y1={y}
                  x2={canvasWidth}
                  y2={y}
                  stroke="color-mix(in srgb, var(--color-border) 55%, transparent)"
                  strokeWidth={1}
                />
              );
            })}
          </svg>
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden
          >
            {edges.map((edge, index) => {
              const x1 = (edge.x1 - displayFrame.minX) * metrics.cellWidth;
              const y1 = (edge.y1 - displayFrame.minY) * metrics.cellHeight;
              const x2 = (edge.x2 - displayFrame.minX) * metrics.cellWidth;
              const y2 = (edge.y2 - displayFrame.minY) * metrics.cellHeight;

              return (
                <line
                  key={`${edge.dependentId}:${edge.prerequisiteId}:${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--color-accent-muted)"
                  strokeWidth={1.5}
                  strokeOpacity={edge.kind === "any" ? 0.75 : 0.55}
                  strokeDasharray={edge.kind === "any" ? "4 3" : undefined}
                  strokeLinecap="round"
                />
              );
            })}
            {linkDragging && linkDragSourceCenter && (
              <line
                x1={linkDragSourceCenter.x}
                y1={linkDragSourceCenter.y}
                x2={linkDragging.pointerX}
                y2={linkDragging.pointerY}
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeOpacity={0.85}
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
            )}
          </svg>
          {marquee && (
            <div
              className="pointer-events-none absolute z-30 border border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              style={{
                left: Math.min(marquee.startX, marquee.pointerX),
                top: Math.min(marquee.startY, marquee.pointerY),
                width: Math.abs(marquee.pointerX - marquee.startX),
                height: Math.abs(marquee.pointerY - marquee.startY),
              }}
              aria-hidden
            />
          )}
          {layoutNodes.map((layoutNode) => {
            const perk = layoutNode.perk;
            const perkId = String(perk.id);
            const { stack, stackIds } = layoutNode;
            const isStackSelected = stackIds.some((id) => selectedPerkIds.has(id));
            const isStackDragging = stackIds.some((id) => dragging?.perkIds.includes(id));

            return (
              <PerkCircleNode
                key={stackIds[0]}
                perk={perk}
                stack={stack}
                perks={perks}
                layoutMode={layoutMode}
                isLinkSource={linkDragging?.sourcePerkId === perkId}
                isSelected={isStackSelected}
                isDragging={isStackDragging}
                frame={displayFrame}
                metrics={metrics}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditingStackIds(stackIds);
                  setCreateModalOpen(false);
                }}
                onPointerDown={(event) => beginDrag(perkId, stackIds, event)}
              />
            );
          })}
          {(layoutMode === "unlink" || layoutMode === "link") && (
            <svg
              className={cn(
                "absolute inset-0 z-20",
                linkDragging && layoutMode === "link" && "pointer-events-none",
              )}
              width={canvasWidth}
              height={canvasHeight}
            >
              {edges.map((edge, index) => (
                <line
                  key={`hit:${edge.dependentId}:${edge.prerequisiteId}:${index}`}
                  x1={(edge.x1 - displayFrame.minX) * metrics.cellWidth}
                  y1={(edge.y1 - displayFrame.minY) * metrics.cellHeight}
                  x2={(edge.x2 - displayFrame.minX) * metrics.cellWidth}
                  y2={(edge.y2 - displayFrame.minY) * metrics.cellHeight}
                  stroke="transparent"
                  strokeWidth={12}
                  strokeLinecap="round"
                  className="cursor-pointer"
                  onClick={() =>
                    layoutMode === "unlink"
                      ? handleUnlinkEdge(edge.dependentId, edge.prerequisiteId)
                      : handleToggleEdgeKind(edge.dependentId, edge.prerequisiteId)
                  }
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {createModalOpen && (
        <CreatePerkNodeModal
          key="create"
          skillId={skillId}
          gridMinX={displayFrame.minX}
          gridMinY={displayFrame.minY}
          gridWidth={displayFrame.width}
          gridHeight={displayFrame.height}
          existingPerks={perks}
          defaultPosition={newPerkPosition}
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreatePerk}
        />
      )}

      {editingStackIds && (
        <CreatePerkNodeModal
          key={`edit-${editingStackIds.join(":")}`}
          skillId={skillId}
          gridMinX={displayFrame.minX}
          gridMinY={displayFrame.minY}
          gridWidth={displayFrame.width}
          gridHeight={displayFrame.height}
          existingPerks={perks}
          defaultPosition={newPerkPosition}
          editingStack={perks.filter((perk) => editingStackIds.includes(String(perk.id)))}
          onClose={() => setEditingStackIds(null)}
          onCreate={handleCreatePerk}
          onSaveStack={handleUpdateStack}
        />
      )}
    </div>
  );
}
