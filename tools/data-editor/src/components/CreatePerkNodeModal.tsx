import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { sortPerkStack } from "@/lib/perkStacks";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type PerkNodeLike = {
  id?: unknown;
  name?: unknown;
  skillReq?: unknown;
  playerLevelReq?: unknown;
  costsPerkPoint?: unknown;
  description?: unknown;
  prerequisites?: unknown;
  prerequisitesAny?: unknown;
  position?: { x?: unknown; y?: unknown };
};

type RankDraft = {
  originalId: string;
  name: string;
  id: string;
  description: string;
  skillReq: string;
  playerLevelReq: string;
  costsPerkPoint: boolean;
  prerequisites: string[];
  prerequisitesAny: string[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniquePerkId(skillId: string, name: string, existingIds: Set<string>): string {
  const base = `${skillId}-${slugify(name) || "perk"}`;
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function perkLabel(perk: PerkNodeLike): string {
  return typeof perk.name === "string" ? perk.name : String(perk.id ?? "Unknown");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function createRankDraft(perk: PerkNodeLike): RankDraft {
  return {
    originalId: String(perk.id),
    name: typeof perk.name === "string" ? perk.name : "",
    id: typeof perk.id === "string" ? perk.id : "",
    description: typeof perk.description === "string" ? perk.description : "",
    skillReq: isFiniteInt(perk.skillReq) ? String(perk.skillReq) : "0",
    playerLevelReq: isFiniteInt(perk.playerLevelReq) ? String(perk.playerLevelReq) : "",
    costsPerkPoint: typeof perk.costsPerkPoint === "boolean" ? perk.costsPerkPoint : true,
    prerequisites: asStringArray(perk.prerequisites),
    prerequisitesAny: asStringArray(perk.prerequisitesAny),
  };
}

const fieldClass =
  "w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1.5 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent-muted)]";

const labelClass = "text-xs font-medium text-[var(--color-muted)]";

export function CreatePerkNodeModal({
  skillId,
  gridMinX,
  gridMinY,
  gridWidth,
  gridHeight,
  existingPerks,
  defaultPosition,
  editingStack = [],
  onClose,
  onCreate,
  onSaveStack,
}: {
  skillId: string;
  gridMinX: number;
  gridMinY: number;
  gridWidth: number;
  gridHeight: number;
  existingPerks: PerkNodeLike[];
  defaultPosition: { x: number; y: number };
  editingStack?: PerkNodeLike[];
  onClose: () => void;
  onCreate: (perk: Record<string, unknown>) => void;
  onSaveStack?: (
    updates: Array<{ originalId: string; perk: Record<string, unknown> }>,
  ) => void;
}) {
  const isEdit = editingStack.length > 0;
  const sortedEditingStack = useMemo(() => sortPerkStack(editingStack), [editingStack]);
  const editingPerkById = useMemo(
    () => new Map(sortedEditingStack.map((perk) => [String(perk.id), perk])),
    [sortedEditingStack],
  );

  const existingIds = useMemo(
    () => new Set(existingPerks.map((perk) => String(perk.id))),
    [existingPerks],
  );

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [skillReq, setSkillReq] = useState("0");
  const [playerLevelReq, setPlayerLevelReq] = useState("");
  const [costsPerkPoint, setCostsPerkPoint] = useState(true);
  const [rankDrafts, setRankDrafts] = useState<RankDraft[]>([]);
  const [positionX, setPositionX] = useState(String(defaultPosition.x));
  const [positionY, setPositionY] = useState(String(defaultPosition.y));
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [prerequisitesAny, setPrerequisitesAny] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) {
      setName("");
      setId("");
      setIdTouched(false);
      setDescription("");
      setSkillReq("0");
      setPlayerLevelReq("");
      setCostsPerkPoint(true);
      setRankDrafts([]);
      setPrerequisites([]);
      setPrerequisitesAny([]);
      setPositionX(String(defaultPosition.x));
      setPositionY(String(defaultPosition.y));
      return;
    }

    const first = sortedEditingStack[0];
    const x = isFiniteInt(first?.position?.x) ? first.position.x : defaultPosition.x;
    const y = isFiniteInt(first?.position?.y) ? first.position.y : defaultPosition.y;
    setPositionX(String(x));
    setPositionY(String(y));
    setRankDrafts(sortedEditingStack.map(createRankDraft));

    if (sortedEditingStack.length === 1 && first) {
      const draft = createRankDraft(first);
      setName(draft.name);
      setId(draft.id);
      setIdTouched(true);
      setDescription(draft.description);
      setSkillReq(draft.skillReq);
      setPlayerLevelReq(draft.playerLevelReq);
      setCostsPerkPoint(draft.costsPerkPoint);
      setPrerequisites(draft.prerequisites);
      setPrerequisitesAny(draft.prerequisitesAny);
    }
  }, [isEdit, sortedEditingStack, defaultPosition.x, defaultPosition.y]);

  const prerequisitePerks = useMemo(
    () =>
      isEdit
        ? existingPerks.filter((perk) => !editingPerkById.has(String(perk.id)))
        : existingPerks,
    [existingPerks, editingPerkById, isEdit],
  );

  const positionMinX = gridMinX;
  const positionMinY = gridMinY;
  const positionMaxX = gridMinX + gridWidth - 1;
  const positionMaxY = gridMinY + gridHeight - 1;

  useEffect(() => {
    if (isEdit || idTouched) return;
    if (!name.trim()) {
      setId("");
      return;
    }
    setId(uniquePerkId(skillId, name, existingIds));
  }, [name, skillId, existingIds, idTouched, isEdit]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const togglePrerequisite = (
    perkId: string,
    setter: (value: string[] | ((current: string[]) => string[])) => void,
    otherSetter: (value: string[] | ((current: string[]) => string[])) => void,
  ) => {
    setter((current) =>
      current.includes(perkId) ? current.filter((value) => value !== perkId) : [...current, perkId],
    );
    otherSetter((current) => current.filter((value) => value !== perkId));
  };

  const updateRankDraft = (originalId: string, patch: Partial<RankDraft>) => {
    setRankDrafts((current) =>
      current.map((draft) => (draft.originalId === originalId ? { ...draft, ...patch } : draft)),
    );
  };

  const buildPerkRecord = (
    draft: RankDraft,
    sourcePerk: PerkNodeLike | undefined,
    position: { x: number; y: number },
    reservedIds: Set<string>,
  ): { ok: true; perk: Record<string, unknown> } | { ok: false; error: string } => {
    const trimmedName = draft.name.trim();
    const trimmedId = draft.id.trim();
    const trimmedDescription = draft.description.trim();

    if (!trimmedName) {
      return { ok: false, error: "Each rank needs a name." };
    }
    if (!trimmedId) {
      return { ok: false, error: "Each rank needs an ID." };
    }
    if (reservedIds.has(trimmedId) && trimmedId !== draft.originalId) {
      return { ok: false, error: `A perk with id "${trimmedId}" already exists.` };
    }

    const parsedSkillReq = Number(draft.skillReq);
    if (!Number.isInteger(parsedSkillReq) || parsedSkillReq < 0) {
      return { ok: false, error: "Skill requirement must be a whole number ≥ 0." };
    }

    let parsedPlayerLevelReq: number | undefined;
    if (draft.playerLevelReq.trim()) {
      parsedPlayerLevelReq = Number(draft.playerLevelReq);
      if (!Number.isInteger(parsedPlayerLevelReq) || parsedPlayerLevelReq < 1) {
        return { ok: false, error: "Player level requirement must be a whole number ≥ 1." };
      }
    }

    const perk: Record<string, unknown> = {
      ...(sourcePerk as Record<string, unknown> | undefined),
      id: trimmedId,
      name: trimmedName,
      skillReq: parsedSkillReq,
      costsPerkPoint: draft.costsPerkPoint,
      position,
      prerequisites: draft.prerequisites,
      description: trimmedDescription,
    };

    if (parsedPlayerLevelReq !== undefined) {
      perk.playerLevelReq = parsedPlayerLevelReq;
    } else if (sourcePerk) {
      delete perk.playerLevelReq;
    }

    if (draft.prerequisitesAny.length > 0) {
      perk.prerequisitesAny = draft.prerequisitesAny;
    } else if (sourcePerk) {
      perk.prerequisitesAny = [];
    }

    return { ok: true, perk };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const x = Number(positionX);
    const y = Number(positionY);
    if (!Number.isInteger(x) || x < positionMinX || x > positionMaxX) {
      setError(`Position X must be between ${positionMinX} and ${positionMaxX}.`);
      return;
    }
    if (!Number.isInteger(y) || y < positionMinY || y > positionMaxY) {
      setError(`Position Y must be between ${positionMinY} and ${positionMaxY}.`);
      return;
    }

    const position = { x, y };

    if (isEdit) {
      if (!onSaveStack) return;

      const drafts =
        sortedEditingStack.length === 1
          ? [
              {
                originalId: sortedEditingStack[0] ? String(sortedEditingStack[0].id) : "",
                name,
                id,
                description,
                skillReq,
                playerLevelReq,
                costsPerkPoint,
                prerequisites,
                prerequisitesAny,
              },
            ]
          : rankDrafts;

      const updates: Array<{ originalId: string; perk: Record<string, unknown> }> = [];
      const reservedIds = new Set(existingIds);

      for (const draft of drafts) {
        reservedIds.delete(draft.originalId);
      }

      for (const draft of drafts) {
        const sourcePerk = editingPerkById.get(draft.originalId);
        const built = buildPerkRecord(draft, sourcePerk, position, reservedIds);
        if (!built.ok) {
          setError(built.error);
          return;
        }
        reservedIds.add(String(built.perk.id));
        updates.push({ originalId: draft.originalId, perk: built.perk });
      }

      onSaveStack(updates);
      return;
    }

    const draft: RankDraft = {
      originalId: "",
      name,
      id,
      description,
      skillReq,
      playerLevelReq,
      costsPerkPoint,
      prerequisites,
      prerequisitesAny,
    };
    const built = buildPerkRecord(draft, undefined, position, existingIds);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    if (!built.perk.effects) {
      built.perk.effects = [];
    }

    onCreate(built.perk);
  };

  if (isEdit && sortedEditingStack.length === 0) {
    return null;
  }

  const renderPrerequisitePickers = (
    rankPrerequisites: string[],
    rankPrerequisitesAny: string[],
    onToggle: (perkId: string, field: "all" | "any") => void,
  ) => {
    if (prerequisitePerks.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className={labelClass}>Prerequisites (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
              All required (AND)
            </p>
            <div className="max-h-28 overflow-y-auto rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
              {prerequisitePerks.map((perk) => {
                const perkId = String(perk.id);
                return (
                  <label
                    key={`all-${perkId}`}
                    className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs hover:bg-[var(--color-surface)]"
                  >
                    <input
                      type="checkbox"
                      checked={rankPrerequisites.includes(perkId)}
                      onChange={() => onToggle(perkId, "all")}
                      className="accent-[var(--color-accent)]"
                    />
                    <span className="truncate">{perkLabel(perk)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
              Any required (OR)
            </p>
            <div className="max-h-28 overflow-y-auto rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
              {prerequisitePerks.map((perk) => {
                const perkId = String(perk.id);
                return (
                  <label
                    key={`any-${perkId}`}
                    className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs hover:bg-[var(--color-surface)]"
                  >
                    <input
                      type="checkbox"
                      checked={rankPrerequisitesAny.includes(perkId)}
                      onChange={() => onToggle(perkId, "any")}
                      className="accent-[var(--color-accent)]"
                    />
                    <span className="truncate">{perkLabel(perk)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-glow)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="perk-node-modal-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="perk-node-modal-title" className="text-sm font-semibold text-[var(--color-foreground)]">
            {isEdit
              ? sortedEditingStack.length > 1
                ? `Edit perk node (${sortedEditingStack.length} ranks)`
                : "Edit perk node"
              : "Create perk node"}
          </h2>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 overflow-y-auto px-4 py-3">
            {isEdit && sortedEditingStack.length > 1 ? (
              rankDrafts.map((draft, index) => (
                <div
                  key={draft.originalId}
                  className="space-y-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    Rank {index + 1} of {rankDrafts.length}
                  </p>

                  <label className="block space-y-1">
                    <span className={labelClass}>Name</span>
                    <input
                      className={fieldClass}
                      value={draft.name}
                      onChange={(event) =>
                        updateRankDraft(draft.originalId, { name: event.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={labelClass}>ID</span>
                    <input
                      className={fieldClass}
                      value={draft.id}
                      onChange={(event) =>
                        updateRankDraft(draft.originalId, { id: event.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={labelClass}>Description</span>
                    <textarea
                      className={cn(fieldClass, "min-h-20 resize-y")}
                      value={draft.description}
                      onChange={(event) =>
                        updateRankDraft(draft.originalId, { description: event.target.value })
                      }
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className={labelClass}>Skill requirement</span>
                      <input
                        className={fieldClass}
                        type="number"
                        min={0}
                        step={1}
                        value={draft.skillReq}
                        onChange={(event) =>
                          updateRankDraft(draft.originalId, { skillReq: event.target.value })
                        }
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className={labelClass}>Player level (optional)</span>
                      <input
                        className={fieldClass}
                        type="number"
                        min={1}
                        step={1}
                        value={draft.playerLevelReq}
                        onChange={(event) =>
                          updateRankDraft(draft.originalId, { playerLevelReq: event.target.value })
                        }
                        placeholder="—"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                    <input
                      type="checkbox"
                      checked={draft.costsPerkPoint}
                      onChange={(event) =>
                        updateRankDraft(draft.originalId, { costsPerkPoint: event.target.checked })
                      }
                      className="accent-[var(--color-accent)]"
                    />
                    Costs a perk point
                  </label>

                  {renderPrerequisitePickers(
                    draft.prerequisites,
                    draft.prerequisitesAny,
                    (perkId, field) => {
                      const all = draft.prerequisites;
                      const any = draft.prerequisitesAny;
                      if (field === "all") {
                        const next = all.includes(perkId)
                          ? all.filter((value) => value !== perkId)
                          : [...all, perkId];
                        updateRankDraft(draft.originalId, {
                          prerequisites: next,
                          prerequisitesAny: any.filter((value) => value !== perkId),
                        });
                      } else {
                        const next = any.includes(perkId)
                          ? any.filter((value) => value !== perkId)
                          : [...any, perkId];
                        updateRankDraft(draft.originalId, {
                          prerequisitesAny: next,
                          prerequisites: all.filter((value) => value !== perkId),
                        });
                      }
                    },
                  )}
                </div>
              ))
            ) : (
              <>
                <label className="block space-y-1">
                  <span className={labelClass}>Name</span>
                  <input
                    className={fieldClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Improved Blocking"
                    autoFocus
                    required
                  />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>ID</span>
                  <input
                    className={fieldClass}
                    value={id}
                    onChange={(event) => {
                      setIdTouched(true);
                      setId(event.target.value);
                    }}
                    placeholder={`${skillId}-my-perk`}
                    required
                  />
                </label>

                <label className="block space-y-1">
                  <span className={labelClass}>Description</span>
                  <textarea
                    className={cn(fieldClass, "min-h-20 resize-y")}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Perk description and in-game effect text…"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className={labelClass}>Skill requirement</span>
                    <input
                      className={fieldClass}
                      type="number"
                      min={0}
                      step={1}
                      value={skillReq}
                      onChange={(event) => setSkillReq(event.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={labelClass}>Player level (optional)</span>
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      step={1}
                      value={playerLevelReq}
                      onChange={(event) => setPlayerLevelReq(event.target.value)}
                      placeholder="—"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                  <input
                    type="checkbox"
                    checked={costsPerkPoint}
                    onChange={(event) => setCostsPerkPoint(event.target.checked)}
                    className="accent-[var(--color-accent)]"
                  />
                  Costs a perk point
                </label>

                {renderPrerequisitePickers(prerequisites, prerequisitesAny, (perkId, field) =>
                  togglePrerequisite(
                    perkId,
                    field === "all" ? setPrerequisites : setPrerequisitesAny,
                    field === "all" ? setPrerequisitesAny : setPrerequisites,
                  ),
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className={labelClass}>Position X</span>
                <input
                  className={fieldClass}
                  type="number"
                  min={positionMinX}
                  max={positionMaxX}
                  step={1}
                  value={positionX}
                  onChange={(event) => setPositionX(event.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClass}>Position Y</span>
                <input
                  className={fieldClass}
                  type="number"
                  min={positionMinY}
                  max={positionMaxY}
                  step={1}
                  value={positionY}
                  onChange={(event) => setPositionY(event.target.value)}
                />
              </label>
            </div>

            {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {isEdit ? "Save changes" : "Create node"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
