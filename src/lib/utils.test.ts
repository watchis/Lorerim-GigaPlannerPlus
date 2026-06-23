import { describe, expect, it } from "vitest";
import { hasDisplayText, stripLeadingPunctuation } from "@/lib/utils";

describe("utils", () => {
  it("detects displayable text", () => {
    expect(hasDisplayText("Hello")).toBe(true);
    expect(hasDisplayText("  42  ")).toBe(true);
    expect(hasDisplayText("")).toBe(false);
    expect(hasDisplayText("   ")).toBe(false);
    expect(hasDisplayText("...")).toBe(false);
    expect(hasDisplayText(null)).toBe(false);
  });

  it("strips leading punctuation from bonus clauses", () => {
    expect(stripLeadingPunctuation(". Gain +10 health.")).toBe("Gain +10 health.");
    expect(stripLeadingPunctuation("Already clean")).toBe("Already clean");
  });
});
