import { describe, expect, it } from "vitest";
import {
  getSkillTreeTitleActionsClassName,
  getSkillTreeTitleNameClassName,
  getSkillTreeTitleNameGroupClassName,
  getSkillTreeTitleRowClassName,
  getSkillTreeTitleSubtitleClassName,
} from "@/lib/skillTreePanelTitle";

describe("skillTreePanelTitle", () => {
  it("uses accent color (gold) for the skill tree title name", () => {
    expect(getSkillTreeTitleNameClassName()).toContain("text-[var(--color-accent)]");
    expect(getSkillTreeTitleNameClassName()).not.toContain("text-[var(--color-foreground)]");
  });

  it("aligns the subtitle with the skill name column in the title grid", () => {
    expect(getSkillTreeTitleRowClassName()).toContain("grid");
    expect(getSkillTreeTitleNameGroupClassName()).toContain("col-start-2");
    expect(getSkillTreeTitleSubtitleClassName()).toContain("col-start-2");
    expect(getSkillTreeTitleSubtitleClassName()).toContain("row-start-2");
    expect(getSkillTreeTitleActionsClassName()).toContain("shrink-0");
  });
});
