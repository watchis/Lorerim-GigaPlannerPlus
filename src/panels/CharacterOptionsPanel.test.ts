/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@/theme/ThemeProvider", () => ({
  usePanelLabels: (panelId: string) => {
    if (panelId === "character-options") {
      return {
        title: "Character Options",
        subtitle: "Optional playthrough rewards",
        oghmaSkills: "Oghma Skills",
        oghmaInfinium: "Oghma Infinium",
        oghmaDescription: "Read the Oghma Infinium",
        oghmaNone: "Not used",
        oghmaClaimed: "Used",
        clearSelection: "Clear",
        backToOptions: "Options",
        playthroughSectionTitle: "Playthrough rewards",
        supernaturalSectionTitle: "Supernatural curses",
        supernaturalSectionDescription: "Curses description",
        activeRewards: "Active rewards",
      };
    }
    if (panelId === "character-setup") {
      return {
        backToOverview: "Overview",
        remaining: "remaining",
        search: "Search",
        none: "None",
        noMatches: "No matches",
      };
    }
    return {};
  },
}));

vi.mock("@/components/SkillIcon", () => ({
  SkillIcon: () => createElement("span", { "data-testid": "skill-icon" }),
}));

import { createInitialBuildState } from "@/engine/buildEngine";
import { useBuildStore } from "@/store/buildStore";
import { CharacterOptionsPanel } from "@/panels/CharacterOptionsPanel";

const oghmaOption = {
  id: "oghma-infinium",
  titleLabel: "oghmaInfinium",
  descriptionLabel: "oghmaDescription",
  defaultChoice: "none",
  extension: "oghma-infinium",
  controlType: "toggle" as const,
  choices: [
    { id: "none", label: "oghmaNone" },
    { id: "claimed", label: "oghmaClaimed" },
  ],
};

describe("CharacterOptionsPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    useBuildStore.setState({
      gameData: {
        game: {
          manifest: { nonAllocatableSkills: [] },
          characterOptions: [oghmaOption],
          skills: [
            { id: "block", name: "Block" },
            { id: "smithing", name: "Smithing" },
          ],
          mechanics: {
            oghmaInfinium: { maxSkills: 6, freeSkillLevels: 5, perkPoints: 3 },
          },
          races: [],
          birthsigns: [],
          deities: [],
          traits: [],
        },
      } as any,
      build: {
        ...createInitialBuildState(),
        characterOptionChoices: { "oghma-infinium": "claimed" },
        oghmaSkillIds: [],
      },
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

  it("opens the Oghma Skills picker without throwing React hooks error #300", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root!.render(createElement(CharacterOptionsPanel));
    });

    const oghmaButton = Array.from(container!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Oghma Skills"),
    );
    expect(oghmaButton).toBeTruthy();

    await act(async () => {
      oghmaButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container!.textContent).toContain("Oghma Skills");
    expect(container!.textContent).toContain("remaining");
    expect(container!.textContent).toContain("Block");
    expect(container!.textContent).toContain("Smithing");
    expect(container!.textContent).not.toContain("Something went wrong");
    expect(
      consoleError.mock.calls.some((args) =>
        args.some(
          (arg) =>
            typeof arg === "string" &&
            (arg.includes("fewer hooks") || arg.includes("Minified React error #300")),
        ),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });
});
