// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeBuild } from "@/engine/buildCodec";
import { createTestBuildState, getTestGameData } from "@/test/helpers";
import { LIBRARY_STORAGE_KEY } from "@/store/savedBuilds";
import { applyUrlBuildImport } from "@/lib/urlBuildImport";

describe("applyUrlBuildImport", () => {
  const replaceState = vi.fn();
  const game = getTestGameData();

  beforeEach(() => {
    window.history.replaceState = replaceState;
    window.localStorage.clear();
    window.history.pushState({}, "", "/Lorerim-GigaPlannerPlus/planner");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("imports a build from the URL even when a library is already persisted", () => {
    const importedBuild = createTestBuildState({ description: "Shared build" });
    const code = encodeBuild(importedBuild, game);
    window.history.pushState({}, "", `/Lorerim-GigaPlannerPlus/planner?build=${encodeURIComponent(code)}`);
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, '{"state":{"savedBuilds":[]}}');

    const importSharedBuild = vi.fn();

    const result = applyUrlBuildImport(game, importSharedBuild);
    expect(result.status).toBe("imported");
    if (result.status === "imported") {
      expect(result.versionMismatch).toBeNull();
    }
    expect(importSharedBuild).toHaveBeenCalledOnce();

    const nextUrl = replaceState.mock.calls.at(-1)?.[2] as string;
    expect(nextUrl).not.toContain("build=");
  });

  it("imports a cross-patch shared build from the URL", () => {
    const importedBuild = createTestBuildState({ description: "Shared build" });
    const otherGame = {
      ...game,
      manifest: { ...game.manifest, version: "5.0.3.6" },
    };
    const code = encodeBuild(importedBuild, otherGame);
    window.history.pushState({}, "", `/Lorerim-GigaPlannerPlus/planner?build=${encodeURIComponent(code)}`);

    const importSharedBuild = vi.fn();

    const result = applyUrlBuildImport(game, importSharedBuild);
    expect(result.status).toBe("imported");
    if (result.status === "imported") {
      expect(result.versionMismatch).toEqual({
        level: "warning",
        sourceVersion: "5.0.3.6",
        currentVersion: game.manifest.version,
      });
    }
    expect(importSharedBuild).toHaveBeenCalledOnce();
  });

  it("skips when the URL has no build parameter", () => {
    const importSharedBuild = vi.fn();

    expect(applyUrlBuildImport(game, importSharedBuild)).toEqual({ status: "skipped-no-build" });
    expect(importSharedBuild).not.toHaveBeenCalled();
  });

  it("skips invalid build codes without throwing", () => {
    window.history.pushState({}, "", "/Lorerim-GigaPlannerPlus/planner?build=not-a-valid-code");
    const importSharedBuild = vi.fn();

    expect(applyUrlBuildImport(game, importSharedBuild)).toEqual({ status: "skipped-invalid" });
    expect(importSharedBuild).not.toHaveBeenCalled();
  });
});
