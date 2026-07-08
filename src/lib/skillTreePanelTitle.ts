export function getSkillTreeTitleRowClassName(): string {
  return "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5";
}

/** Name + bonus indicator; grows to truncate long titles while keeping the bonus beside the text. */
export function getSkillTreeTitleNameGroupClassName(): string {
  return "col-start-2 row-start-1 flex min-w-0 items-center gap-0.5 overflow-hidden";
}

export function getSkillTreeTitleNameClassName(): string {
  return "min-w-0 shrink truncate font-[family-name:var(--font-heading)] text-base font-semibold leading-5 text-[var(--color-accent)]";
}

export function getSkillTreeTitleIconClassName(): string {
  return "col-start-1 row-start-1 h-5 w-5 shrink-0 text-[var(--color-accent-muted)]";
}

export function getSkillTreeTitleActionsClassName(): string {
  return "col-start-3 row-start-1 flex shrink-0 items-center";
}

export function getSkillTreeTitleSubtitleClassName(): string {
  return "mt-1 col-start-2 row-start-2 text-xs text-[var(--color-muted)]";
}
