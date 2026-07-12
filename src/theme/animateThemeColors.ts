import { SUPERNATURAL_THEME_TRANSITION_MS } from "@/theme/themeTransition";

export function toThemeCssVarName(key: string): string {
  return `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

/** Perceptually even blend — avoids the bright/white midpoint of sRGB interpolation. */
export function lerpThemeColor(from: string, to: string, t: number): string {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const fromPercent = (1 - t) * 100;
  return `color-mix(in oklch, ${from} ${fromPercent.toFixed(2)}%, ${to})`;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function animateThemeColors(
  root: HTMLElement,
  fromColors: Record<string, string>,
  toColors: Record<string, string>,
  options?: {
    durationMs?: number;
    onFrame?: (colors: Record<string, string>) => void;
    onComplete?: () => void;
  },
): () => void {
  const durationMs = options?.durationMs ?? SUPERNATURAL_THEME_TRANSITION_MS;
  const keys = Object.keys(toColors);
  const start = performance.now();
  let frameId = 0;
  let cancelled = false;

  root.classList.add("theme-transition-active");

  const tick = (now: number) => {
    if (cancelled) return;

    const linear = Math.min(1, (now - start) / durationMs);
    const t = easeInOut(linear);
    const frameColors: Record<string, string> = {};

    for (const key of keys) {
      const from = fromColors[key] ?? toColors[key]!;
      const to = toColors[key]!;
      const value = lerpThemeColor(from, to, t);
      frameColors[key] = value;
      root.style.setProperty(toThemeCssVarName(key), value);
    }

    options?.onFrame?.(frameColors);

    if (linear < 1) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    root.classList.remove("theme-transition-active");
    options?.onComplete?.();
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    root.classList.remove("theme-transition-active");
  };
}
