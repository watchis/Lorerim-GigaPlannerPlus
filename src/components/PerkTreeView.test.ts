/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useBuildStore } from "@/store/buildStore";
import { useUiStore } from "@/store/uiStore";
import { PerkTreeView } from "@/components/PerkTreeView";

beforeAll(() => {
  // JSDOM doesn't implement layout measurements; this ensures the fit container
  // stays "unmeasured" and `fitSize` would normally remain null.
  class ResizeObserverMock {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(cb: any) {
      this.cb = cb;
    }
    observe() {
      // Intentionally do nothing.
    }
    disconnect() {}
    unobserve() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = ResizeObserverMock;
});

vi.mock("@/components/PerkNode", () => ({
  // eslint-disable-next-line react/display-name
  PerkNode: (props: { positionKey?: string }) =>
    createElement("div", {
      "data-testid": "perk-node",
      "data-position-key": props.positionKey ?? "",
    }),
}));

vi.mock("@/hooks/usePerkBadgePlacements", () => ({
  usePerkBadgePlacements: () => new Map(),
}));

vi.mock("@/components/ui/tooltip", () => ({
  useSupportsHover: () => false,
}));

vi.mock("@/engine/buildEngine", async () => {
  const actual = await vi.importActual<typeof import("@/engine/buildEngine")>("@/engine/buildEngine");
  return {
    ...actual,
    arePrerequisitesMet: () => true,
    computeDestinyPerkPointsSpent: () => 0,
    getEarnedDestinyPerkPoints: () => 0,
    getPerkSkillId: () => null,
    getStoredSkillLevel: () => 0,
  };
});

describe("PerkTreeView fit fallback", () => {
  it("renders perk nodes even when fitSize cannot be computed yet", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    useUiStore.setState({
      perkBadgeVisibility: { playerLevelReq: false, skillLevelReq: false, perkName: false },
    });

    useBuildStore.setState({
      gameData: { game: {} } as any,
      build: {
        selectedPerkIds: [],
        playerLevel: 1,
      } as any,
      computed: { perkPointsRemaining: 0 } as any,
    });

    const tree = {
      skillId: "alchemy",
      skillName: "Alchemy",
      grid: { width: 2, height: 2 },
      perks: [
        {
          id: "p1",
          name: "Perk 1",
          skillReq: 0,
          playerLevelReq: undefined,
          costsPerkPoint: false,
          position: { x: 0, y: 0 },
          prerequisites: [],
          description: "",
          effects: [],
        },
      ],
    } as any;

    await act(async () => {
      root.render(
        createElement(PerkTreeView, {
          fit: true,
          tree,
          labels: {},
        }),
      );
    });

    const perkNode = container.querySelector('[data-testid="perk-node"]');
    expect(perkNode).toBeTruthy();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

