// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { applySupernaturalDataset } from "@/theme/ThemeProvider";

describe("ThemeProvider supernatural dataset", () => {
  afterEach(() => {
    delete document.documentElement.dataset.supernaturalTheme;
  });

  it("applies the supernatural dataset attribute immediately", () => {
    applySupernaturalDataset(document.documentElement, "vampire");
    expect(document.documentElement.dataset.supernaturalTheme).toBe("vampire");

    applySupernaturalDataset(document.documentElement, "werewolf");
    expect(document.documentElement.dataset.supernaturalTheme).toBe("werewolf");

    applySupernaturalDataset(document.documentElement, null);
    expect(document.documentElement.dataset.supernaturalTheme).toBeUndefined();
  });
});
