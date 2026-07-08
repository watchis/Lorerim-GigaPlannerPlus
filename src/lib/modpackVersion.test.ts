import { describe, expect, it } from "vitest";
import {
  formatModpackVersion,
  getModpackMajorVersion,
  getModpackVersionForBuildCard,
  getModpackVersionMismatchLevel,
  isModpackVersionMismatch,
  normalizeModpackVersionForCompare,
} from "@/lib/modpackVersion";

describe("formatModpackVersion", () => {
  it("prefixes versions without v", () => {
    expect(formatModpackVersion("5.0.4.2")).toBe("v5.0.4.2");
  });

  it("keeps versions already prefixed with v", () => {
    expect(formatModpackVersion("v5.0.4.2")).toBe("v5.0.4.2");
  });

  it("returns empty string for blank input", () => {
    expect(formatModpackVersion("  ")).toBe("");
  });
});

describe("getModpackVersionForBuildCard", () => {
  const current = "5.0.4.2";

  it("uses the saved build's modpack version when set", () => {
    expect(getModpackVersionForBuildCard({ savedModpackVersion: "4.9.0.1", currentModpackVersion: current })).toBe(
      "v4.9.0.1",
    );
  });

  it("falls back to the current modpack version when saved version is missing", () => {
    expect(getModpackVersionForBuildCard({ savedModpackVersion: undefined, currentModpackVersion: current })).toBe(
      "v5.0.4.2",
    );
  });

  it("trims whitespace from the saved build's modpack version", () => {
    expect(
      getModpackVersionForBuildCard({ savedModpackVersion: "  5.0.4.2  ", currentModpackVersion: current }),
    ).toBe("v5.0.4.2");
  });
});

describe("normalizeModpackVersionForCompare", () => {
  it("strips a leading v for comparison", () => {
    expect(normalizeModpackVersionForCompare("v5.0.4.2")).toBe("5.0.4.2");
    expect(normalizeModpackVersionForCompare("5.0.4.2")).toBe("5.0.4.2");
  });
});

describe("getModpackMajorVersion", () => {
  it("returns the first dot-separated segment", () => {
    expect(getModpackMajorVersion("5.0.4.2")).toBe("5");
    expect(getModpackMajorVersion("v4.9.0.1")).toBe("4");
  });
});

describe("getModpackVersionMismatchLevel", () => {
  const current = "5.0.4.2";

  it("returns none when versions match or saved version is missing", () => {
    expect(
      getModpackVersionMismatchLevel({ savedModpackVersion: "5.0.4.2", currentModpackVersion: current }),
    ).toBe("none");
    expect(
      getModpackVersionMismatchLevel({ savedModpackVersion: undefined, currentModpackVersion: current }),
    ).toBe("none");
  });

  it("returns warning when versions differ within the same major", () => {
    expect(
      getModpackVersionMismatchLevel({ savedModpackVersion: "5.0.4.1", currentModpackVersion: current }),
    ).toBe("warning");
  });

  it("returns error when major versions differ", () => {
    expect(
      getModpackVersionMismatchLevel({ savedModpackVersion: "4.9.0.1", currentModpackVersion: current }),
    ).toBe("error");
  });
});

describe("isModpackVersionMismatch", () => {
  const current = "5.0.4.2";

  it("returns false when saved version matches current", () => {
    expect(
      isModpackVersionMismatch({ savedModpackVersion: "5.0.4.2", currentModpackVersion: current }),
    ).toBe(false);
    expect(
      isModpackVersionMismatch({ savedModpackVersion: "v5.0.4.2", currentModpackVersion: current }),
    ).toBe(false);
  });

  it("returns true when saved version differs from current", () => {
    expect(
      isModpackVersionMismatch({ savedModpackVersion: "4.9.0.1", currentModpackVersion: current }),
    ).toBe(true);
  });

  it("returns false when saved version is missing (display falls back to current)", () => {
    expect(
      isModpackVersionMismatch({ savedModpackVersion: undefined, currentModpackVersion: current }),
    ).toBe(false);
  });
});

