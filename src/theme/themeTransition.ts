/** Duration (ms) for supernatural curse theme color transitions — keep in sync with themeTransitions.css */
export const SUPERNATURAL_THEME_TRANSITION_MS = 1000;

export function scheduleThemeTransitionsReady(
  root: HTMLElement = document.documentElement,
): void {
  requestAnimationFrame(() => {
    root.classList.add("theme-transitions-ready");
  });
}
