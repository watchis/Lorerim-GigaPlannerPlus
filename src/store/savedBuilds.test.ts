import { describe, expect, it } from "vitest";
import { createTestBuildState } from "@/test/helpers";
import {
  acknowledgeSavedBuildEdits,
  createSavedBuild,
  isSavedBuildImported,
  markSavedBuildImported,
  touchSavedBuild,
  uniqueBuildName,
} from "@/store/savedBuilds";

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

describe("imported build markers", () => {
  const build = createTestBuildState();

  it("marks and detects imported builds", () => {
    const entry = markSavedBuildImported(createSavedBuild("Imported", build));
    expect(isSavedBuildImported(entry)).toBe(true);
    expect(entry.importedAt).toBeTypeOf("number");
  });

  it("clears the imported marker when build content is touched", () => {
    const entry = markSavedBuildImported(createSavedBuild("Imported", build));
    const edited = touchSavedBuild(entry, { ...build, description: "Edited locally" });

    expect(isSavedBuildImported(edited)).toBe(false);
    expect(edited.importedAt).toBeNull();
    expect(edited.build.description).toBe("Edited locally");
  });

  it("acknowledgeSavedBuildEdits is a no-op for non-imported builds", () => {
    const entry = createSavedBuild("Local", build);
    expect(acknowledgeSavedBuildEdits(entry)).toBe(entry);
  });
});
