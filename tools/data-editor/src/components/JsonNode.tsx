import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { getCuratedArrayKind, curatedArrayLabel } from "@/lib/curatedArrayEntries";
import { cn } from "@/lib/utils";
import { CreateGameEntryModal } from "./CreateGameEntryModal";
import { useEditorFilePath } from "./EditorFileContext";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { matchesTreeSearch, normalizeTreeSearchQuery } from "@/lib/treeSearch";
import { useTreeSearch } from "./TreeSearchContext";
import {
  addButtonClass,
  fieldDescriptionClass,
  fieldKeyClass,
  fieldKeyLabelClass,
  fieldRowClass,
  fieldMonoClass,
  fieldTitleClass,
  isBlockField,
  isIdField,
  isTitleField,
  itemCardClass,
  cardDeleteButtonClass,
} from "./editorStyles";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const selectClass =
  "h-6 w-[4rem] shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-1 text-[9px] text-[var(--color-muted)] transition-colors duration-150 hover:border-[var(--color-border)] hover:text-[var(--color-foreground)] focus:border-[var(--color-accent-muted)]";

function valueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function defaultForType(type: string): JsonValue {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return null;
  }
}

function CompactIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-error)]/80 transition-colors duration-150 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
    >
      <Minus className="size-3.5" />
    </button>
  );
}

function CardDeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cardDeleteButtonClass}
    >
      <Trash2 className="size-3" />
      Delete
    </button>
  );
}

function keyInputSize(value: string): number {
  return Math.max(14, Math.min(value.length + 2, 28));
}

function KeyInput({
  value,
  onChange,
  suggestions,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  className?: string;
}) {
  const dataListId = useId();
  return (
    <>
      <input
        type="text"
        value={value}
        size={keyInputSize(value)}
        onChange={(event) => onChange(event.target.value)}
        list={suggestions.length ? dataListId : undefined}
        className={className}
        title={value}
      />
      {suggestions.length > 0 && (
        <datalist id={dataListId}>
          {suggestions.slice(0, 50).map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </>
  );
}

function PrimitiveEditor({
  value,
  onChange,
  fieldKey,
  inline,
}: {
  value: string | number | boolean | null;
  onChange: (value: JsonValue) => void;
  fieldKey?: string;
  inline?: boolean;
}) {
  const type = valueType(value);
  const key = fieldKey ?? "";

  if (type === "boolean") {
    return (
      <label className="inline-flex h-6 items-center gap-1.5 text-[10px]">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="size-3 accent-[var(--color-accent)]"
        />
        <span className="text-[var(--color-muted)]">{value ? "true" : "false"}</span>
      </label>
    );
  }

  if (type === "number") {
    const numericValue = typeof value === "number" ? value : 0;
    return (
      <input
        type="number"
        value={numericValue}
        onChange={(event) => {
          const next = event.target.value === "" ? 0 : Number(event.target.value);
          onChange(Number.isNaN(next) ? 0 : next);
        }}
        className={cn(fieldMonoClass, inline ? "max-w-[6rem]" : "max-w-[8rem]")}
      />
    );
  }

  if (type === "null") {
    return <span className="text-[10px] italic text-[var(--color-muted)]">null</span>;
  }

  const stringValue = String(value ?? "");

  if (isTitleField(key)) {
    return (
      <input
        type="text"
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        className={fieldTitleClass}
      />
    );
  }

  if (!inline && isBlockField(key, value)) {
    return (
      <textarea
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        rows={Math.min(5, Math.max(2, stringValue.split("\n").length))}
        className={fieldDescriptionClass}
      />
    );
  }

  return (
    <input
      type="text"
      value={stringValue}
      onChange={(event) => onChange(event.target.value)}
      className={fieldMonoClass}
    />
  );
}

function TypeSelect({ value, onChange }: { value: string; onChange: (type: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
      <option value="string">txt</option>
      <option value="number">num</option>
      <option value="boolean">bool</option>
      <option value="null">null</option>
      <option value="array">[]</option>
      <option value="object">obj</option>
    </select>
  );
}

function deriveEntryTitle(
  value: JsonValue,
  options?: { key?: string; index?: number },
): { title: string; subtitle?: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, JsonValue>;
    const name = typeof record.name === "string" && record.name ? record.name : null;
    const id = typeof record.id === "string" && record.id ? record.id : null;
    const skillName =
      typeof record.skillName === "string" && record.skillName ? record.skillName : null;
    const titleLabel =
      typeof record.titleLabel === "string" && record.titleLabel ? record.titleLabel : null;

    if (name && id && name !== id) return { title: name, subtitle: id };
    if (name) return { title: name };
    if (skillName) return { title: skillName };
    if (titleLabel) return { title: titleLabel };
    if (id) return { title: id };
  }

  if (options?.key) {
    return { title: options.key };
  }

  if (options?.index !== undefined) {
    return { title: `Item ${options.index + 1}` };
  }

  return { title: "Entry" };
}

function EntryCard({
  title,
  subtitle,
  meta,
  onRemove,
  children,
  className,
  monoTitle = false,
  cardDepth = 0,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
  monoTitle?: boolean;
  cardDepth?: number;
}) {
  const [collapsed, setCollapsed] = useState(cardDepth > 0);

  return (
    <Card
      className={cn(
        itemCardClass,
        "min-w-0 w-full shadow-none",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "entry-card-header flex-row items-start justify-between space-y-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/40 px-3 py-2.5",
          collapsed && "border-b-0",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-1.5 rounded-[var(--radius-sm)] text-left transition-colors hover:text-[var(--color-accent)]"
        >
          <ChevronRight
            className={cn(
              "mt-0.5 size-3.5 shrink-0 text-[var(--color-muted)] transition-transform duration-150",
              !collapsed && "rotate-90",
            )}
          />
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "entry-card-title block truncate text-sm font-medium leading-snug text-[var(--color-foreground)]",
                monoTitle && "font-mono text-xs tracking-normal",
              )}
            >
              {title}
            </span>
            {subtitle ? (
              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-muted)]">{subtitle}</p>
            ) : meta ? (
              <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{meta}</p>
            ) : null}
          </div>
        </button>
        {onRemove ? <CardDeleteButton onClick={onRemove} label="Delete entry" /> : null}
      </CardHeader>
      {!collapsed ? (
        <CardContent className="min-w-0 w-full space-y-1 px-3 py-2.5">{children}</CardContent>
      ) : null}
    </Card>
  );
}

function sortObjectEntries(entries: [string, JsonValue][]): [string, JsonValue][] {
  const priority = ["id", "name", "skillName", "titleLabel", "description"];
  const longLast = (key: string, val: JsonValue) => (isBlockField(key, val) ? 1 : 0);
  return [...entries].sort((a, b) => {
    const aIndex = priority.indexOf(a[0]);
    const bIndex = priority.indexOf(b[0]);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    }
    const longDiff = longLast(a[0], a[1]) - longLast(b[0], b[1]);
    if (longDiff !== 0) return longDiff;
    return a[0].localeCompare(b[0]);
  });
}

function ObjectEditor({
  value,
  onChange,
  depth,
  cardDepth,
  keySuggestions,
  sectionLabel,
  onRemove,
  onKeyChange,
  keyName,
  keySuggestionsForRename,
}: {
  value: Record<string, JsonValue>;
  onChange: (value: JsonValue) => void;
  depth: number;
  cardDepth: number;
  keySuggestions: string[];
  sectionLabel?: string;
  onRemove?: () => void;
  onKeyChange?: (key: string) => void;
  keyName?: string;
  keySuggestionsForRename?: string[];
}) {
  const searchQuery = useTreeSearch();
  const entries = useMemo(() => sortObjectEntries(Object.entries(value)), [value]);
  const visibleEntries = useMemo(() => {
    if (!normalizeTreeSearchQuery(searchQuery)) return entries;
    return entries.filter(([key, entryValue]) => matchesTreeSearch(entryValue, searchQuery, { key }));
  }, [entries, searchQuery]);

  const sectionMatches = matchesTreeSearch(value, searchQuery, { key: sectionLabel });

  const updateKey = (oldKey: string, newKey: string, entryValue: JsonValue) => {
    if (oldKey === newKey) return;
    const next = { ...value };
    delete next[oldKey];
    next[newKey] = entryValue;
    onChange(next);
  };

  const updateEntry = (key: string, entryValue: JsonValue) => {
    onChange({ ...value, [key]: entryValue });
  };

  const removeEntry = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const addEntry = () => {
    let candidate = "newKey";
    let index = 1;
    while (candidate in value) {
      candidate = `newKey${index}`;
      index += 1;
    }
    onChange({ ...value, [candidate]: "" });
  };

  const entryCardDepth = sectionLabel ? cardDepth + 1 : cardDepth;

  const body = (
    <div className="space-y-0.5">
      {visibleEntries.map(([key, entryValue]) => (
        <ObjectEntry
          key={key}
          entryKey={key}
          entryValue={entryValue}
          depth={depth}
          cardDepth={entryCardDepth}
          existingKeys={Object.keys(value)}
          keySuggestions={keySuggestions}
          onKeyChange={(newKey) => updateKey(key, newKey, entryValue)}
          onValueChange={(next) => updateEntry(key, next)}
          onRemove={() => removeEntry(key)}
        />
      ))}
      {!normalizeTreeSearchQuery(searchQuery) ? (
      <button
        type="button"
        onClick={addEntry}
        className={addButtonClass}
      >
        <Plus className="size-3" />
        Add field
      </button>
      ) : null}
    </div>
  );

  if (!sectionLabel) {
    if (normalizeTreeSearchQuery(searchQuery) && visibleEntries.length === 0) {
      return (
        <p className="px-1 py-2 text-xs text-[var(--color-muted)]">No matching fields.</p>
      );
    }
    return <div className={cn("space-y-0.5", depth === 0 && "space-y-2")}>{body}</div>;
  }

  if (normalizeTreeSearchQuery(searchQuery) && !sectionMatches && visibleEntries.length === 0) {
    return null;
  }

  const title = sectionLabel;
  const filteredMeta =
    normalizeTreeSearchQuery(searchQuery) && visibleEntries.length !== entries.length
      ? `${visibleEntries.length} of ${entries.length} fields`
      : `${entries.length} field${entries.length === 1 ? "" : "s"}`;

  return (
    <EntryCard
      title={title}
      meta={filteredMeta}
      onRemove={onRemove}
      className="py-0.5"
      monoTitle
      cardDepth={cardDepth}
    >
      {onKeyChange && keyName !== undefined ? (
        <KeyInput
          value={keyName}
          onChange={onKeyChange}
          suggestions={keySuggestionsForRename ?? []}
          className={cn(fieldKeyClass, "mb-1 max-w-md")}
        />
      ) : null}
      {body}
    </EntryCard>
  );
}

function ObjectEntry({
  entryKey,
  entryValue,
  depth,
  cardDepth,
  existingKeys,
  keySuggestions,
  onKeyChange,
  onValueChange,
  onRemove,
}: {
  entryKey: string;
  entryValue: JsonValue;
  depth: number;
  cardDepth: number;
  existingKeys: string[];
  keySuggestions: string[];
  onKeyChange: (key: string) => void;
  onValueChange: (value: JsonValue) => void;
  onRemove: () => void;
}) {
  const searchQuery = useTreeSearch();
  const existing = useMemo(() => new Set(existingKeys), [existingKeys]);
  const suggestions = useMemo(
    () => keySuggestions.filter((suggestion) => suggestion === entryKey || !existing.has(suggestion)),
    [keySuggestions, existing, entryKey],
  );

  const entryType = valueType(entryValue);
  const isNested = entryType === "object" || entryType === "array";
  const isBlock = !isNested && isBlockField(entryKey, entryValue);
  const showRenamableKey = !isTitleField(entryKey) && !isIdField(entryKey);

  if (normalizeTreeSearchQuery(searchQuery) && !matchesTreeSearch(entryValue, searchQuery, { key: entryKey })) {
    return null;
  }

  if (isNested) {
    return (
      <div className="py-0.5">
        <JsonNode
          value={entryValue}
          onChange={onValueChange}
          depth={depth + 1}
          cardDepth={cardDepth}
          keySuggestions={keySuggestions}
          sectionLabel={entryKey}
          onRemove={onRemove}
          onKeyChange={showRenamableKey ? onKeyChange : undefined}
          keyName={entryKey}
          keySuggestionsForRename={suggestions}
        />
      </div>
    );
  }

  if (isBlock) {
    return (
      <EntryCard title={entryKey} onRemove={onRemove} monoTitle cardDepth={cardDepth}>
        {showRenamableKey ? (
          <KeyInput value={entryKey} onChange={onKeyChange} suggestions={suggestions} className={fieldKeyClass} />
        ) : null}
        <div className="flex min-w-0 w-full items-start gap-1">
          <div className="min-w-0 flex-1">
            <PrimitiveEditor value={entryValue as string | number | boolean | null} onChange={onValueChange} fieldKey={entryKey} />
          </div>
          <TypeSelect value={entryType} onChange={(nextType) => onValueChange(defaultForType(nextType))} />
        </div>
      </EntryCard>
    );
  }

  return (
    <div className={fieldRowClass}>
      {showRenamableKey ? (
        <KeyInput value={entryKey} onChange={onKeyChange} suggestions={suggestions} className={fieldKeyClass} />
      ) : (
        <span className={fieldKeyLabelClass} title={entryKey}>
          {entryKey}
        </span>
      )}
      <div className="min-w-0 w-full">
        <PrimitiveEditor
          value={entryValue as string | number | boolean | null}
          onChange={onValueChange}
          fieldKey={entryKey}
          inline
        />
      </div>
      <TypeSelect value={entryType} onChange={(nextType) => onValueChange(defaultForType(nextType))} />
      <CompactIconButton onClick={onRemove} label="Remove field" />
    </div>
  );
}

function ArrayEditor({
  value,
  onChange,
  depth,
  cardDepth,
  keySuggestions,
  sectionLabel,
  onRemove,
  onKeyChange,
  keyName,
  keySuggestionsForRename,
}: {
  value: JsonValue[];
  onChange: (value: JsonValue) => void;
  depth: number;
  cardDepth: number;
  keySuggestions: string[];
  sectionLabel?: string;
  onRemove?: () => void;
  onKeyChange?: (key: string) => void;
  keyName?: string;
  keySuggestionsForRename?: string[];
}) {
  const filePath = useEditorFilePath();
  const curatedKind =
    filePath && sectionLabel ? getCuratedArrayKind(filePath, sectionLabel) : null;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const searchQuery = useTreeSearch();
  const allObjects = value.every(
    (item) => valueType(item) === "object" && item !== null && !Array.isArray(item),
  );
  const visibleItems = useMemo(() => {
    const indexed = value.map((item, index) => ({ item, index }));
    if (!normalizeTreeSearchQuery(searchQuery)) return indexed;
    return indexed.filter(({ item }) => matchesTreeSearch(item, searchQuery));
  }, [value, searchQuery]);

  const sectionMatches = matchesTreeSearch(value, searchQuery, { key: sectionLabel });

  const updateItem = (index: number, item: JsonValue) => {
    const next = [...value];
    next[index] = item;
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  const addItem = () => {
    if (curatedKind) {
      setCreateModalOpen(true);
      return;
    }
    onChange([...value, allObjects ? {} : ""]);
  };

  const handleCreateEntry = (entry: Record<string, unknown>) => {
    onChange([...value, entry as JsonValue]);
    setCreateModalOpen(false);
  };

  const itemCardDepth = sectionLabel ? cardDepth + 1 : cardDepth === 0 ? 1 : cardDepth + 1;

  const items = (
    <>
      <div className={cn(allObjects && visibleItems.length > 0 ? "space-y-2" : "space-y-0.5")}>
        {visibleItems.map(({ item, index }) => (
          <ArrayItem
            key={index}
            item={item}
            index={index}
            depth={depth}
            cardDepth={itemCardDepth}
            keySuggestions={keySuggestions}
            onChange={(next) => updateItem(index, next)}
            onRemove={() => removeItem(index)}
          />
        ))}
        {normalizeTreeSearchQuery(searchQuery) && visibleItems.length === 0 ? (
          <p className="px-1 py-2 text-xs text-[var(--color-muted)]">No matching items.</p>
        ) : null}
        {!normalizeTreeSearchQuery(searchQuery) ? (
          <button type="button" onClick={addItem} className={addButtonClass}>
            <Plus className="size-3" />
            {curatedKind ? `Add ${curatedArrayLabel(curatedKind)}` : "Add item"}
          </button>
        ) : null}
      </div>
      {createModalOpen && curatedKind ? (
        <CreateGameEntryModal
          kind={curatedKind}
          existingItems={value}
          onClose={() => setCreateModalOpen(false)}
          onCreate={handleCreateEntry}
        />
      ) : null}
    </>
  );

  if (!sectionLabel) {
    if (normalizeTreeSearchQuery(searchQuery) && visibleItems.length === 0) {
      return (
        <p className="px-1 py-2 text-xs text-[var(--color-muted)]">No matching items.</p>
      );
    }
    return items;
  }

  if (normalizeTreeSearchQuery(searchQuery) && !sectionMatches && visibleItems.length === 0) {
    return null;
  }

  const title = sectionLabel;
  const filteredMeta =
    normalizeTreeSearchQuery(searchQuery) && visibleItems.length !== value.length
      ? `${visibleItems.length} of ${value.length} items`
      : `${value.length} item${value.length === 1 ? "" : "s"}`;

  return (
    <EntryCard
      title={title}
      meta={filteredMeta}
      onRemove={onRemove}
      className="py-0.5"
      monoTitle
      cardDepth={cardDepth}
    >
      {onKeyChange && keyName !== undefined ? (
        <KeyInput
          value={keyName}
          onChange={onKeyChange}
          suggestions={keySuggestionsForRename ?? []}
          className={cn(fieldKeyClass, "mb-1 max-w-md")}
        />
      ) : null}
      {items}
    </EntryCard>
  );
}

function ArrayItem({
  item,
  index,
  depth,
  cardDepth,
  keySuggestions,
  onChange,
  onRemove,
}: {
  item: JsonValue;
  index: number;
  depth: number;
  cardDepth: number;
  keySuggestions: string[];
  onChange: (value: JsonValue) => void;
  onRemove: () => void;
}) {
  const itemType = valueType(item);
  const isNested = itemType === "object" || itemType === "array";
  const { title, subtitle } = deriveEntryTitle(item, { index });

  if (!isNested) {
    return (
      <div className="flex min-w-0 w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--color-surface-hover)]/60">
        <span className="w-6 shrink-0 text-center font-mono text-[10px] text-[var(--color-muted)]">{index}</span>
        <div className="min-w-0 w-full">
          <PrimitiveEditor value={item as string | number | boolean | null} onChange={onChange} inline />
        </div>
        <TypeSelect value={itemType} onChange={(nextType) => onChange(defaultForType(nextType))} />
        <CompactIconButton onClick={onRemove} label="Remove item" />
      </div>
    );
  }

  return (
    <EntryCard title={title} subtitle={subtitle} onRemove={onRemove} cardDepth={cardDepth}>
      <JsonNode value={item} onChange={onChange} depth={depth + 1} cardDepth={cardDepth + 1} keySuggestions={keySuggestions} />
    </EntryCard>
  );
}

export function JsonNode({
  value,
  onChange,
  depth = 0,
  cardDepth = 0,
  keySuggestions = [],
  fieldKey,
  sectionLabel,
  onRemove,
  onKeyChange,
  keyName,
  keySuggestionsForRename,
}: {
  value: unknown;
  onChange: (value: JsonValue) => void;
  depth?: number;
  cardDepth?: number;
  keySuggestions?: string[];
  fieldKey?: string;
  sectionLabel?: string;
  onRemove?: () => void;
  onKeyChange?: (key: string) => void;
  keyName?: string;
  keySuggestionsForRename?: string[];
}) {
  const type = valueType(value);

  if (type === "object" && value !== null && !Array.isArray(value)) {
    return (
      <ObjectEditor
        value={value as Record<string, JsonValue>}
        onChange={onChange}
        depth={depth}
        cardDepth={cardDepth}
        keySuggestions={keySuggestions}
        sectionLabel={sectionLabel}
        onRemove={onRemove}
        onKeyChange={onKeyChange}
        keyName={keyName}
        keySuggestionsForRename={keySuggestionsForRename}
      />
    );
  }

  if (type === "array") {
    return (
      <ArrayEditor
        value={value as JsonValue[]}
        onChange={onChange}
        depth={depth}
        cardDepth={cardDepth}
        keySuggestions={keySuggestions}
        sectionLabel={sectionLabel}
        onRemove={onRemove}
        onKeyChange={onKeyChange}
        keyName={keyName}
        keySuggestionsForRename={keySuggestionsForRename}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 w-full">
        <PrimitiveEditor
          value={value as string | number | boolean | null}
          onChange={onChange}
          fieldKey={fieldKey}
          inline
        />
      </div>
      {type !== "null" && (
        <TypeSelect value={type} onChange={(nextType) => onChange(defaultForType(nextType))} />
      )}
    </div>
  );
}
