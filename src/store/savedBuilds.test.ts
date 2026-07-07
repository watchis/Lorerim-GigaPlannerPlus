import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import { createSavedBuild, uniqueBuildName } from "@/store/savedBuilds";

describe("uniqueBuildName", () => {
  const build = createTestBuildState();

  it("returns the desired name when it is unused", () => {
    const builds = [createSavedBuild("Existing", build)];
    expect(uniqueBuildName("Imported", builds)).toBe("Imported");
  });

  it("falls back to the next default name when desired name is blank", () => {
    const builds = [createSavedBuild("Build 1", build)];
    expect(uniqueBuildName("", builds)).toBe("Build 2");
  });

  it("appends copy when the desired name already exists", () => {
    const builds = [createSavedBuild("Tank", build)];
    expect(uniqueBuildName("Tank", builds)).toBe("Tank copy");
  });

  it("increments the copy suffix until the name is unique", () => {
    const builds = [
      createSavedBuild("Tank", build),
      createSavedBuild("Tank copy", build),
    ];
    expect(uniqueBuildName("Tank", builds)).toBe("Tank copy 2");
  });
});
