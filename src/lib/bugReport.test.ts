import { describe, expect, it } from "vitest";
import { BUG_REPORT_URL } from "@/lib/bugReport";

describe("bugReport", () => {
  it("points to the GitHub issue chooser", () => {
    expect(BUG_REPORT_URL).toBe(
      "https://github.com/watchis/Lorerim-GigaPlannerPlus/issues/new/choose",
    );
  });
});
