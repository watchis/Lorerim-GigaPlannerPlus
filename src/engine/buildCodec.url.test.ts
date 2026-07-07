// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBuildFromUrl,
  getBuildFromUrl,
  setBuildInUrl,
} from "@/engine/buildCodec";

describe("buildCodec URL helpers", () => {
  const replaceState = vi.fn();

  beforeEach(() => {
    window.history.replaceState = replaceState;
    window.history.pushState({}, "", "/Lorerim-GigaPlannerPlus/planner");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the build query parameter", () => {
    window.history.pushState({}, "", "/Lorerim-GigaPlannerPlus/planner?build=2.example-code");

    expect(getBuildFromUrl()).toBe("2.example-code");
  });

  it("sets the build query parameter in the URL", () => {
    setBuildInUrl("2.example-code");

    expect(replaceState).toHaveBeenCalledWith(
      {},
      "",
      expect.stringContaining("build=2.example-code"),
    );
  });

  it("clears the build query parameter from the URL", () => {
    window.history.pushState({}, "", "/Lorerim-GigaPlannerPlus/planner?build=2.example-code");

    clearBuildFromUrl();

    const nextUrl = replaceState.mock.calls.at(-1)?.[2] as string;
    expect(nextUrl).not.toContain("build=");
    expect(new URL(nextUrl, "http://localhost").searchParams.has("build")).toBe(false);
  });
});
