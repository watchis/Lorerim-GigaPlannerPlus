/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

// JSDOM doesn't provide ResizeObserver by default.
class ResizeObserverMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(cb: any) {
    this.cb = cb;
  }
  observe(target: Element) {
    // Ensure the layout takes the three-column path in tests.
    // `computePlannerLayoutMetrics` reads `element.clientWidth`.
    if (!("clientWidth" in target) || (target as HTMLElement).clientWidth === 0) {
      Object.defineProperty(target, "clientWidth", { value: 1400, configurable: true });
    }
    this.cb();
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

const localStorageMock = vi.hoisted(() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
});

vi.stubGlobal("localStorage", localStorageMock);

vi.mock("@/layout/panelRegistry", () => ({
  panelRegistry: {
    "character-setup": () => null,
    "skill-trees": () => null,
    "skill-trees-sidebar": () => null,
  },
}));

vi.mock("@/layout/PlannerSwipePanels", () => ({
  PlannerSwipePanels: () => null,
}));

let isFullHeightPanel: (panelId: string) => boolean;
let LayoutRenderer: (props: { layout: any }) => any;

beforeAll(async () => {
  ({ isFullHeightPanel, LayoutRenderer } = await import("@/layout/LayoutRenderer"));
});

describe("LayoutRenderer isFullHeightPanel", () => {
  it("treats side and center panes as full-height for internal scroll", () => {
    expect(isFullHeightPanel("character-setup")).toBe(true);
    expect(isFullHeightPanel("skill-trees-sidebar")).toBe(true);
    expect(isFullHeightPanel("skill-trees")).toBe(true);
  });

  it("does not treat unknown panels as full-height", () => {
    expect(isFullHeightPanel("character-info")).toBe(false);
    expect(isFullHeightPanel("unknown-panel")).toBe(false);
  });
});

describe("LayoutRenderer full-height panel sizing", () => {
  it("renders full-height panels in a flex-1 wrapper (stable pane sizing)", async () => {
    const layout = {
      columns: [
        { width: "320px", panels: ["character-setup"] },
        { width: "minmax(0, 1fr)", panels: ["skill-trees"] },
        { width: "340px", panels: ["skill-trees-sidebar"] },
      ],
    } as any;

    const { act, createElement } = await import("react");
    const { createRoot } = await import("react-dom/client");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(LayoutRenderer, { layout }));
    });

    // Wrapper div around each Panel should include flex-1 for full-height panes.
    const wrappers = Array.from(container.querySelectorAll("div")).filter((el) =>
      el.className.includes("flex-1") && el.className.includes("min-h-0") && el.className.includes("flex-col"),
    );
    expect(wrappers.length).toBeGreaterThan(0);

    act(() => root.unmount());
    container.remove();
  });

  it("renders the three-column grid on first paint for wide viewports", async () => {
    const layout = {
      columns: [
        { width: "320px", panels: ["character-setup"] },
        { width: "minmax(0, 1fr)", panels: ["skill-trees"] },
        { width: "340px", panels: ["skill-trees-sidebar"] },
      ],
    } as any;

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });

    const { act, createElement } = await import("react");
    const { createRoot } = await import("react-dom/client");

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(LayoutRenderer, { layout }));
    });

    const grid = container.querySelector(".grid.min-h-0.flex-1");
    expect(grid).not.toBeNull();
    expect((grid as HTMLElement).style.gridTemplateColumns).not.toBe("");

    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
    act(() => root.unmount());
    container.remove();
  });
});

