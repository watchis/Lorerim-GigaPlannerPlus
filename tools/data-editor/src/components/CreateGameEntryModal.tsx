import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  buildCuratedArrayEntry,
  curatedArrayLabel,
  curatedExemplarField,
  curatedExemplarLabel,
  findCuratedExemplar,
  type CuratedArrayKind,
} from "@/lib/curatedArrayEntries";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1.5 text-xs text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent-muted)]";

const labelClass = "text-xs font-medium text-[var(--color-muted)]";

const SKILL_CATEGORIES = ["combat", "crafting", "magic", "stealth", "utility", "special"] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base: string, existingIds: Set<string>): string {
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function collectExistingIds(items: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id === "string" && id) ids.add(id);
  }
  return ids;
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      {multiline ? (
        <textarea
          className={cn(fieldClass, "min-h-20 resize-y")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={fieldClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function CreateGameEntryModal({
  kind,
  existingItems,
  onClose,
  onCreate,
}: {
  kind: CuratedArrayKind;
  existingItems: unknown[];
  onClose: () => void;
  onCreate: (entry: Record<string, unknown>) => void;
}) {
  const existingIds = useMemo(() => collectExistingIds(existingItems), [existingItems]);
  const exemplar = useMemo(() => findCuratedExemplar(kind, existingItems), [kind, existingItems]);
  const exemplarName = curatedExemplarLabel(exemplar);
  const preview = (key: string) => curatedExemplarField(exemplar, key);
  const entityLabel = curatedArrayLabel(kind);

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [bonus, setBonus] = useState("");
  const [group, setGroup] = useState("");
  const [shrine, setShrine] = useState("");
  const [follower, setFollower] = useState("");
  const [devotee, setDevotee] = useState("");
  const [tenets, setTenets] = useState("");
  const [race, setRace] = useState("");
  const [starting, setStarting] = useState("");
  const [requirement, setRequirement] = useState("");
  const [category, setCategory] = useState<(typeof SKILL_CATEGORIES)[number]>("combat");
  const [majorEligible, setMajorEligible] = useState(true);
  const [minorEligible, setMinorEligible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (idTouched) return;
    const slug = slugify(name);
    if (!slug) {
      setId("");
      return;
    }
    setId(uniqueId(slug, existingIds));
  }, [name, idTouched, existingIds]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedId = id.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedId) {
      setError("ID is required.");
      return;
    }
    if (existingIds.has(trimmedId)) {
      setError(`ID "${trimmedId}" already exists.`);
      return;
    }

    const entry = buildCuratedArrayEntry(
      kind,
      {
        id: trimmedId,
        name: trimmedName,
        description,
        bonus,
        group,
        shrine,
        follower,
        devotee,
        tenets,
        race,
        starting,
        requirement,
        category,
        majorEligible,
        minorEligible,
      },
      existingItems,
    );

    onCreate(entry);
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
        aria-labelledby="game-entry-modal-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 id="game-entry-modal-title" className="text-sm font-semibold text-[var(--color-foreground)]">
              Add {entityLabel}
            </h2>
            {exemplarName ? (
              <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                Field previews from {exemplarName}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 overflow-y-auto px-4 py-3">
            <TextField label="Name" value={name} onChange={setName} required placeholder={preview("name")} />
            <label className="block space-y-1">
              <span className={labelClass}>ID</span>
              <input
                className={fieldClass}
                value={id}
                onChange={(event) => {
                  setIdTouched(true);
                  setId(event.target.value);
                }}
                required
                placeholder={preview("id")}
              />
            </label>

            {kind === "deities" ? (
              <>
                <TextField
                  label="Shrine blessing"
                  value={shrine}
                  onChange={setShrine}
                  multiline
                  placeholder={preview("shrine")}
                />
                <TextField
                  label="Follower blessing"
                  value={follower}
                  onChange={setFollower}
                  multiline
                  placeholder={preview("follower")}
                />
                <TextField
                  label="Devotee blessing"
                  value={devotee}
                  onChange={setDevotee}
                  multiline
                  placeholder={preview("devotee")}
                />
                <TextField
                  label="Tenets"
                  value={tenets}
                  onChange={setTenets}
                  multiline
                  placeholder={preview("tenets")}
                />
                <TextField
                  label="Race restriction label"
                  value={race}
                  onChange={setRace}
                  placeholder={preview("race")}
                />
                <TextField
                  label="Starting races"
                  value={starting}
                  onChange={setStarting}
                  placeholder={preview("starting")}
                />
                <TextField
                  label="Requirement"
                  value={requirement}
                  onChange={setRequirement}
                  placeholder={preview("requirement")}
                />
              </>
            ) : null}

            {kind === "birthsigns" ? (
              <>
                <TextField
                  label="Group / season"
                  value={group}
                  onChange={setGroup}
                  multiline
                  placeholder={preview("group")}
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline
                  placeholder={preview("description")}
                />
                <TextField
                  label="Bonus summary"
                  value={bonus}
                  onChange={setBonus}
                  multiline
                  placeholder={preview("bonus")}
                />
              </>
            ) : null}

            {kind === "traits" ? (
              <>
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline
                  placeholder={preview("description")}
                />
                <TextField
                  label="Bonus summary"
                  value={bonus}
                  onChange={setBonus}
                  multiline
                  placeholder={preview("bonus")}
                />
              </>
            ) : null}

            {kind === "races" ? (
              <>
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline
                  placeholder={preview("description")}
                />
                <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
                  Starting attributes, skills, and regen are copied from the existing &quot;none&quot; template.
                  Tune those values in the tree after creating the race.
                </p>
              </>
            ) : null}

            {kind === "skills" ? (
              <>
                <label className="block space-y-1">
                  <span className={labelClass}>Category</span>
                  <select
                    className={fieldClass}
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as (typeof SKILL_CATEGORIES)[number])
                    }
                  >
                    {SKILL_CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {preview("category") ? (
                    <p className="text-[10px] text-[var(--color-muted)]">
                      e.g. {preview("category")} ({exemplarName})
                    </p>
                  ) : null}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                  <input
                    type="checkbox"
                    checked={majorEligible}
                    onChange={(event) => setMajorEligible(event.target.checked)}
                    className="accent-[var(--color-accent)]"
                  />
                  Major skill eligible
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                  <input
                    type="checkbox"
                    checked={minorEligible}
                    onChange={(event) => setMinorEligible(event.target.checked)}
                    className="accent-[var(--color-accent)]"
                  />
                  Minor skill eligible
                </label>
              </>
            ) : null}

            {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add {entityLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
