/**
 * @vitest-environment jsdom
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/theme/ThemeProvider", () => ({
  usePanelLabels: (panelId: string) => {
    if (panelId !== "character-setup") return {};
    return {
      title: "Character Setup",
      openOptions: "Options",
      race: "Race",
      birthsign: "Birthsign",
      deity: "Deity",
      noneSelected: "None selected",
      traits: "Traits",
      majorSkills: "Major Skills",
      minorSkills: "Minor Skills",
    };
  },
}));

vi.mock("@/components/AttributesAllocator", () => ({
  AttributesAllocator: () => <div data-testid="attributes-allocator" />,
}));

vi.mock("@/components/DestinyTreeSection", () => ({
  DestinyTreeSection: () => <div data-testid="destiny-tree" />,
}));

vi.mock("@/components/SkillIcon", () => ({
  SkillIcon: () => <div data-testid="skill-icon" />,
}));

vi.mock("@/engine/buildEngine", async () => {
  const actual = await vi.importActual<typeof import("@/engine/buildEngine")>("@/engine/buildEngine");
  return {
    ...actual,
    getTraitLimit: () => 0,
  };
});

import { createInitialBuildState } from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { CharacterSetupPanel } from "@/panels/CharacterSetupPanel";

describe("CharacterSetupPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useBuildStore.setState({
      gameData: {
        game: {
          manifest: { limits: { majorSkills: 10, minorSkills: 10 } },
          races: [],
          birthsigns: [],
          deities: [],
          traits: [],
          skills: [],
        },
      } as any,
      build: createInitialBuildState(),
      computed: null,
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.restoreAllMocks();
  });

  it("keeps the pane header sticky while the column scrolls", () => {
    act(() => {
      root!.render(createElement(CharacterSetupPanel));
    });

    const stickyEl = container?.querySelector(".sticky");
    expect(stickyEl).toBeTruthy();
    expect((stickyEl as HTMLElement).className).toContain("top-0");
  });
});

