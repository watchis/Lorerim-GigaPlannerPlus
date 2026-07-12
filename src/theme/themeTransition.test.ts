// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  scheduleThemeTransitionsReady,
  SUPERNATURAL_THEME_TRANSITION_MS,
} from "@/theme/themeTransition";

describe("themeTransition", () => {
  afterEach(() => {
    document.documentElement.classList.remove("theme-transitions-ready");
  });

  it("uses a 1–3 second supernatural theme transition duration", () => {
    expect(SUPERNATURAL_THEME_TRANSITION_MS).toBeGreaterThanOrEqual(1000);
    expect(SUPERNATURAL_THEME_TRANSITION_MS).toBeLessThanOrEqual(3000);
    expect(SUPERNATURAL_THEME_TRANSITION_MS).toBe(2000);
  });

  it("enables CSS transitions after the first paint", async () => {
    scheduleThemeTransitionsReady(document.documentElement);
    expect(document.documentElement.classList.contains("theme-transitions-ready")).toBe(false);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    expect(document.documentElement.classList.contains("theme-transitions-ready")).toBe(true);
  });
});
