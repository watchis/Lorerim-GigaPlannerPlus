import { describe, expect, it } from "vitest";
import {
  getMobileSkillTreeTitleClassName,
  getSkillTreeTitleActionsClassName,
  getSkillTreeTitleContentClassName,
} from "@/lib/skillTreePanelTitle";

describe("skillTreePanelTitle", () => {
  it("uses accent color (gold) for the mobile skill tree title", () => {
    expect(getMobileSkillTreeTitleClassName()).toContain(
      "text-[var(--color-accent)]",
    );
    expect(getMobileSkillTreeTitleClassName()).not.toContain(
      "text-[var(--color-foreground)]",
    );
  });

  it("keeps the title flexible and indicator actions always visible", () => {
    expect(getSkillTreeTitleContentClassName()).toContain("min-w-0");
    expect(getSkillTreeTitleContentClassName()).toContain("flex-1");
    expect(getSkillTreeTitleActionsClassName()).toContain("shrink-0");
  });
});

