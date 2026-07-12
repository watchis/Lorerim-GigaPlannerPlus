import { easeInOut, lerpColor, normalizeColorToHex } from "@/theme/colorInterpolation";
import { SUPERNATURAL_THEME_TRANSITION_MS } from "@/theme/themeTransition";

export function toThemeCssVarName(key: string): string {
  return `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

let colorProbe: HTMLDivElement | null = null;

function getColorProbe(): HTMLDivElement {
  if (!colorProbe) {
    colorProbe = document.createElement("div");
    colorProbe.setAttribute("aria-hidden", "true");
    colorProbe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;";
    document.documentElement.appendChild(colorProbe);
  }
  return colorProbe;
}

/** Resolve the color currently painted for each theme variable. */
export function readCurrentThemeColors(keys: Iterable<string>): Record<string, string> {
  const probe = getColorProbe();
  const colors: Record<string, string> = {};

  for (const key of keys) {
    probe.style.color = `var(${toThemeCssVarName(key)})`;
    const resolved = getComputedStyle(probe).color;
    colors[key] = normalizeColorToHex(resolved);
  }

  return colors;
}

export function commitThemeColors(
  root: HTMLElement,
  colors: Record<string, string>,
  keys: Iterable<string> = Object.keys(colors),
): void {
  for (const key of keys) {
    root.style.setProperty(toThemeCssVarName(key), normalizeColorToHex(colors[key]!));
  }
}

export function runThemeColorTransition(
  root: HTMLElement,
  fromColors: Record<string, string>,
  toColors: Record<string, string>,
  durationMs = SUPERNATURAL_THEME_TRANSITION_MS,
): { cancel: () => Record<string, string>; finished: Promise<void> } {
  const keys = Object.keys(toColors);
  const from = Object.fromEntries(
    keys.map((key) => [key, normalizeColorToHex(fromColors[key] ?? toColors[key]!)]),
  );
  const to = Object.fromEntries(keys.map((key) => [key, normalizeColorToHex(toColors[key]!)]));

  let frameId = 0;
  let cancelled = false;
  let finishResolve: (() => void) | null = null;
  const start = performance.now();

  const finished = new Promise<void>((resolve) => {
    finishResolve = resolve;
  });

  const finish = (resolved: Record<string, string>) => {
    if (cancelled) return;
    cancelled = true;
    cancelAnimationFrame(frameId);
    root.classList.remove("theme-transition-active");
    commitThemeColors(root, resolved, keys);
    finishResolve?.();
  };

  root.classList.add("theme-transition-active");

  const tick = (now: number) => {
    if (cancelled) return;

    const linear = Math.min(1, (now - start) / durationMs);
    const t = easeInOut(linear);
    const frameColors: Record<string, string> = {};

    for (const key of keys) {
      const value = lerpColor(from[key]!, to[key]!, t);
      frameColors[key] = value;
      root.style.setProperty(toThemeCssVarName(key), value);
    }

    if (linear < 1) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    finish(to);
  };

  frameId = requestAnimationFrame(tick);

  return {
    finished,
    cancel: () => {
      if (cancelled) return readCurrentThemeColors(keys);
      const resolved = readCurrentThemeColors(keys);
      finish(resolved);
      return resolved;
    },
  };
}
