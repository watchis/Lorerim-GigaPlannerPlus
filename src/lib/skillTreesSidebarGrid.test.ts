import { describe, expect, it } from "vitest";
import { getSkillTreesSidebarGridColumns } from "@/lib/skillTreesSidebarGrid";

describe("skillTreesSidebarGrid", () => {
  it("switches to 2 columns when hypothetical 3-col card width drops below half original", () => {
    // If original card width is 100px, half is 50px.
    // gap-1.5 approximated as 6px => gapTotalForThree=12px.
    // threshold containerWidth = 3*(50) + 12 = 162px.
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 161, gapPx: 6, originalCardWidthPx: 100 }),
    ).toBe(2);
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 162, gapPx: 6, originalCardWidthPx: 100 }),
    ).toBe(3);
  });

  it("keeps 3 columns for larger containers", () => {
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 300, gapPx: 6, originalCardWidthPx: 100 }),
    ).toBe(3);
  });

  it("falls back to 2 columns for narrow containers", () => {
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 10, gapPx: 6, originalCardWidthPx: 100 }),
    ).toBe(2);
  });

  it("uses the passed gapPx in the threshold calculation", () => {
    // original=120 => half=60.
    // gap-1 approximated 4px => gapTotalForThree=8px.
    // threshold containerWidth=3*60+8=188px.
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 187, gapPx: 4, originalCardWidthPx: 120 }),
    ).toBe(2);
    expect(
      getSkillTreesSidebarGridColumns({ containerWidthPx: 188, gapPx: 4, originalCardWidthPx: 120 }),
    ).toBe(3);
  });
});

