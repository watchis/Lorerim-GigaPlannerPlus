import { describe, expect, it } from "vitest";
import { getMobileSkillTreeTitleClassName } from "@/lib/skillTreePanelTitle";

describe("skillTreePanelTitle", () => {
  it("uses accent color (gold) for the mobile skill tree title", () => {
    expect(getMobileSkillTreeTitleClassName()).toContain(
      "text-[var(--color-accent)]",
    );
    expect(getMobileSkillTreeTitleClassName()).not.toContain(
      "text-[var(--color-foreground)]",
    );
  });
});

