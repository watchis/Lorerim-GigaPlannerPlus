const fieldBase =
  "rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 px-2 font-mono text-[10px] leading-tight text-[var(--color-foreground)] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[color-mix(in_srgb,var(--color-border)_60%,var(--color-accent-muted))] focus:border-[var(--color-accent-muted)] focus:shadow-[0_0_0_2px_var(--color-accent-subtle)]";

export const fieldInputClass = `h-6 w-full min-w-0 max-w-full ${fieldBase}`;

export const fieldMonoClass = `h-6 w-full min-w-0 max-w-full font-mono tabular-nums ${fieldBase}`;

export const fieldTitleClass =
  "h-9 w-full min-w-0 max-w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 px-2.5 font-[family-name:var(--font-heading)] text-sm font-semibold tracking-wide text-[var(--color-accent)] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[color-mix(in_srgb,var(--color-border)_60%,var(--color-accent-muted))] focus:border-[var(--color-accent-muted)] focus:shadow-[0_0_0_2px_var(--color-accent-subtle)]";

export const fieldDescriptionClass =
  "w-full min-w-0 max-w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[var(--color-foreground)] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[color-mix(in_srgb,var(--color-border)_60%,var(--color-accent-muted))] focus:border-[var(--color-accent-muted)] focus:shadow-[0_0_0_2px_var(--color-accent-subtle)]";

export const fieldKeyClass =
  "h-5 w-full min-w-0 max-w-[14rem] shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50 px-1.5 font-mono text-[9px] font-medium text-[var(--color-accent-muted)] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[var(--color-border)] focus:border-[var(--color-accent-muted)] focus:shadow-[0_0_0_2px_var(--color-accent-subtle)]";

export const fieldKeyLabelClass =
  "min-w-0 max-w-[14rem] shrink break-words font-mono text-[9px] font-medium leading-tight text-[var(--color-accent-muted)]";

export const fieldRowClass =
  "grid w-full min-w-0 grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors duration-150 hover:bg-[var(--color-surface-hover)]/60";

export const itemCardClass =
  "entry-card rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/40";

export const cardDeleteButtonClass =
  "inline-flex h-7 shrink-0 items-center gap-1 self-center rounded-[var(--radius-sm)] border border-[var(--color-error)]/45 bg-[var(--color-error)]/12 px-2 text-[10px] font-medium text-[var(--color-error)] transition-colors duration-150 hover:border-[var(--color-error)] hover:bg-[var(--color-error)]/22 hover:text-[var(--color-error-muted)]";

export const panelCardClass =
  "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]";

export const addButtonClass =
  "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] px-2.5 text-[11px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:border-[var(--color-accent-muted)] hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]";

export const modeToggleActiveClass =
  "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] shadow-sm";

export const modeToggleInactiveClass =
  "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]";

export function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim();
}

export function isTitleField(key: string): boolean {
  return ["name", "skillName", "titleLabel", "shrine", "follower", "devotee"].includes(key);
}

export function isLongTextField(key: string): boolean {
  return (
    ["description", "bonus", "group", "tenets", "starting", "requirement", "subtitle", "footer", "intro"].includes(
      key,
    ) || key.endsWith("Label") || key.endsWith("Description")
  );
}

export function isIdField(key: string): boolean {
  return key === "id" || key.endsWith("Id");
}

export function isBlockField(key: string, value: unknown): boolean {
  if (isTitleField(key) || isLongTextField(key)) return true;
  const stringValue = typeof value === "string" ? value : "";
  return stringValue.includes("\n") || stringValue.length > 72;
}
