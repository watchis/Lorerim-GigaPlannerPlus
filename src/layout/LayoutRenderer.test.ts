import { beforeAll, describe, expect, it, vi } from "vitest";

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

let isFullHeightPanel: (panelId: string) => boolean;

beforeAll(async () => {
  ({ isFullHeightPanel } = await import("@/layout/LayoutRenderer"));
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

