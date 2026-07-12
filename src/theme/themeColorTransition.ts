import { SUPERNATURAL_THEME_TRANSITION_MS } from "@/theme/themeTransition";

export const THEME_MIX_VAR = "--theme-mix";

export function toThemeCssVarName(key: string): string {
  return `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

function toThemeEndpointVarName(key: string, endpoint: "from" | "to"): string {
  const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
  return `--theme-${cssKey}-${endpoint}`;
}

export function themeColorMixExpression(key: string): string {
  const fromVar = toThemeEndpointVarName(key, "from");
  const toVar = toThemeEndpointVarName(key, "to");
  return `color-mix(in oklch, var(${fromVar}) calc((1 - var(${THEME_MIX_VAR}, 1)) * 100%), var(${toVar}))`;
}

export function setupThemeColorMix(
  root: HTMLElement,
  fromColors: Record<string, string>,
  toColors: Record<string, string>,
): string[] {
  const keys = Object.keys(toColors);

  for (const key of keys) {
    const from = fromColors[key] ?? toColors[key]!;
    const to = toColors[key]!;
    root.style.setProperty(toThemeEndpointVarName(key, "from"), from);
    root.style.setProperty(toThemeEndpointVarName(key, "to"), to);
    root.style.setProperty(toThemeCssVarName(key), themeColorMixExpression(key));
  }

  return keys;
}

export function clearThemeColorMix(root: HTMLElement, keys: Iterable<string>): void {
  for (const key of keys) {
    root.style.removeProperty(toThemeEndpointVarName(key, "from"));
    root.style.removeProperty(toThemeEndpointVarName(key, "to"));
  }
  root.style.removeProperty(THEME_MIX_VAR);
}

export function commitThemeColors(
  root: HTMLElement,
  colors: Record<string, string>,
  keys: Iterable<string> = Object.keys(colors),
): void {
  for (const key of keys) {
    root.style.setProperty(toThemeCssVarName(key), colors[key]!);
  }
  clearThemeColorMix(root, keys);
}

export function readResolvedThemeColors(
  root: HTMLElement,
  keys: Iterable<string>,
): Record<string, string> {
  const styles = getComputedStyle(root);
  const colors: Record<string, string> = {};

  for (const key of keys) {
    colors[key] = styles.getPropertyValue(toThemeCssVarName(key)).trim();
  }

  return colors;
}

function isThemeMixTransitionEvent(event: TransitionEvent): boolean {
  return event.propertyName === "--theme-mix" || event.propertyName === "theme-mix";
}

export function runThemeColorTransition(
  root: HTMLElement,
  fromColors: Record<string, string>,
  toColors: Record<string, string>,
  durationMs = SUPERNATURAL_THEME_TRANSITION_MS,
): { cancel: () => Record<string, string>; finished: Promise<void> } {
  const keys = setupThemeColorMix(root, fromColors, toColors);
  root.classList.add("theme-transition-active");
  root.style.setProperty(THEME_MIX_VAR, "0");

  let cancelled = false;
  let timeoutId = 0;
  let finishResolve: (() => void) | null = null;

  const finished = new Promise<void>((resolve) => {
    finishResolve = resolve;
  });

  const finish = (resolvedColors: Record<string, string>) => {
    if (cancelled) return;
    cancelled = true;
    window.clearTimeout(timeoutId);
    root.removeEventListener("transitionend", onTransitionEnd);
    root.classList.remove("theme-transition-active");
    commitThemeColors(root, resolvedColors, keys);
    finishResolve?.();
  };

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== root || !isThemeMixTransitionEvent(event)) return;
    finish(toColors);
  };

  root.addEventListener("transitionend", onTransitionEnd);
  timeoutId = window.setTimeout(() => finish(toColors), durationMs + 64);

  requestAnimationFrame(() => {
    if (cancelled) return;
    root.style.setProperty(THEME_MIX_VAR, "1");
  });

  return {
    finished,
    cancel: () => {
      if (cancelled) return readResolvedThemeColors(root, keys);
      const resolved = readResolvedThemeColors(root, keys);
      finish(resolved);
      return resolved;
    },
  };
}
