// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LazyTreeMiniPreview } from "@/components/LazyTreeMiniPreview";
import type { PerkTree } from "@/data/schemas";

vi.mock("@/components/TreeMiniPreview", () => ({
  TreeMiniPreview: () => <div data-testid="tree-mini-preview">mini tree</div>,
}));

const tree = {
  skillId: "smithing",
  skillName: "Smithing",
  perks: [],
} as unknown as PerkTree;

describe("LazyTreeMiniPreview", () => {
  it("mounts the mini tree after the tile intersects the viewport", () => {
    let observerCallback: IntersectionObserverCallback | null = null;
    const disconnect = vi.fn();
    const observe = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<LazyTreeMiniPreview tree={tree} className="h-10 w-10" />);

    expect(screen.queryByTestId("tree-mini-preview")).toBeNull();
    expect(observe).toHaveBeenCalledTimes(1);

    observerCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(screen.getByTestId("tree-mini-preview")).toBeTruthy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
