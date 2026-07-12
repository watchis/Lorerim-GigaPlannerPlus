import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { Labels, Theme } from "@/data/schemas";
import type { SupernaturalThemeVariant } from "@/lib/supernaturalTheme";
import {
  readCurrentThemeColors,
  runThemeColorTransition,
  toThemeCssVarName,
} from "@/theme/themeColorTransition";
import { scheduleThemeTransitionsReady } from "@/theme/themeTransition";

interface ThemeContextValue {
  theme: Theme;
  labels: Labels;
  supernaturalVariant: SupernaturalThemeVariant | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  theme: Theme;
  labels: Labels;
  supernaturalVariant?: SupernaturalThemeVariant | null;
  children: ReactNode;
}

export function applySupernaturalDataset(
  root: HTMLElement,
  supernaturalVariant: SupernaturalThemeVariant | null,
): void {
  if (supernaturalVariant) {
    root.dataset.supernaturalTheme = supernaturalVariant;
  } else {
    delete root.dataset.supernaturalTheme;
  }
}

export function applyThemeToRoot(
  root: HTMLElement,
  theme: Theme,
  supernaturalVariant: SupernaturalThemeVariant | null,
): void {
  root.dataset.theme = theme.mode;
  applySupernaturalDataset(root, supernaturalVariant);

  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(toThemeCssVarName(key), value);
  }

  root.style.setProperty("--font-heading", theme.fonts.heading);
  root.style.setProperty("--font-body", theme.fonts.body);

  for (const [key, value] of Object.entries(theme.radius)) {
    root.style.setProperty(`--radius-${key}`, value);
  }

  for (const [key, value] of Object.entries(theme.shadows)) {
    root.style.setProperty(`--shadow-${key}`, value);
  }
}

function prefersReducedThemeMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ThemeProvider({
  theme,
  labels,
  supernaturalVariant = null,
  children,
}: ThemeProviderProps) {
  const hasAppliedTheme = useRef(false);
  const activeTransitionRef = useRef<{ cancel: () => Record<string, string> } | null>(null);
  const previousVariantRef = useRef(supernaturalVariant);

  useEffect(() => {
    return () => {
      activeTransitionRef.current?.cancel();
      activeTransitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const toColors = { ...theme.colors };
    const colorKeys = Object.keys(toColors);
    const variantChanged = previousVariantRef.current !== supernaturalVariant;
    previousVariantRef.current = supernaturalVariant;

    applySupernaturalDataset(root, supernaturalVariant);

    if (!hasAppliedTheme.current) {
      applyThemeToRoot(root, theme, supernaturalVariant);
      hasAppliedTheme.current = true;
      scheduleThemeTransitionsReady(root);
      return;
    }

    if (!variantChanged) {
      applyThemeToRoot(root, theme, supernaturalVariant);
      return;
    }

    if (activeTransitionRef.current) {
      activeTransitionRef.current.cancel();
      activeTransitionRef.current = null;
    }

    const canAnimate =
      !prefersReducedThemeMotion() && root.classList.contains("theme-transitions-ready");

    if (!canAnimate) {
      applyThemeToRoot(root, theme, supernaturalVariant);
      return;
    }

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;

      const fromColors = readCurrentThemeColors(colorKeys);
      const transition = runThemeColorTransition(root, fromColors, toColors);
      activeTransitionRef.current = transition;

      void transition.finished.then(() => {
        if (activeTransitionRef.current !== transition) return;
        applyThemeToRoot(root, theme, supernaturalVariant);
        activeTransitionRef.current = null;
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [theme, supernaturalVariant]);

  return (
    <ThemeContext.Provider value={{ theme, labels, supernaturalVariant }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeConfig must be used within ThemeProvider");
  }
  return ctx;
}

export function useSupernaturalThemeVariant(): SupernaturalThemeVariant | null {
  return useThemeConfig().supernaturalVariant;
}

export function usePanelLabels(panelId: string): Record<string, string> {
  const { labels } = useThemeConfig();
  return labels.panels[panelId] ?? {};
}
