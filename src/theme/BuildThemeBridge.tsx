import { useMemo, type ReactNode } from "react";
import type { Labels, Theme } from "@/data/schemas";
import {
  applySupernaturalThemeVariant,
  getSupernaturalThemeVariant,
} from "@/lib/supernaturalTheme";
import { useBuildStore } from "@/store/buildStore";
import { ThemeProvider } from "@/theme/ThemeProvider";

interface BuildThemeBridgeProps {
  baseTheme: Theme;
  labels: Labels;
  children: ReactNode;
}

export function BuildThemeBridge({ baseTheme, labels, children }: BuildThemeBridgeProps) {
  const build = useBuildStore((s) => s.build);
  const supernaturalVariant = getSupernaturalThemeVariant(build);
  const theme = useMemo(
    () => applySupernaturalThemeVariant(baseTheme, supernaturalVariant),
    [baseTheme, supernaturalVariant],
  );

  return (
    <ThemeProvider theme={theme} labels={labels} supernaturalVariant={supernaturalVariant}>
      {children}
    </ThemeProvider>
  );
}
