import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TooltipProvider, HoverTapTooltip } from "@/components/ui/tooltip";

function mockMatchMedia(matchesForQuery: (query: string) => boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const mql = {
        matches: matchesForQuery(query),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      return mql;
    }),
  });
}

describe("HoverTapTooltip (touch)", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    root = null;
    container?.remove();
    container = null;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders the tooltip on the first tap when hover is not supported", () => {
    // Treat environment as touch-only (no hover).
    mockMatchMedia((query) => query === "(hover: hover) and (pointer: fine)" ? false : false);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <HoverTapTooltip content="easy mode warning tooltip">
            <button type="button">warn</button>
          </HoverTapTooltip>
        </TooltipProvider>,
      );
    });

    const button = document.querySelector("button");
    expect(button).toBeTruthy();

    act(() => {
      button?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
    });

    expect(document.body.textContent).toContain("easy mode warning tooltip");
  });

  it("ensures only one tooltip is open at a time on touch devices", () => {
    mockMatchMedia((query) => query === "(hover: hover) and (pointer: fine)" ? false : false);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <div>
            <HoverTapTooltip content="tooltip one">
              <button type="button" aria-label="one">
                one
              </button>
            </HoverTapTooltip>
            <HoverTapTooltip content="tooltip two">
              <button type="button" aria-label="two">
                two
              </button>
            </HoverTapTooltip>
          </div>
        </TooltipProvider>,
      );
    });

    const buttonOne = document.querySelector('button[aria-label="one"]');
    const buttonTwo = document.querySelector('button[aria-label="two"]');
    expect(buttonOne).toBeTruthy();
    expect(buttonTwo).toBeTruthy();

    act(() => {
      buttonOne?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }),
      );
    });
    expect(document.body.textContent).toContain("tooltip one");
    expect(document.body.textContent).not.toContain("tooltip two");

    act(() => {
      buttonTwo?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }),
      );
    });

    expect(document.body.textContent).toContain("tooltip two");
    expect(document.body.textContent).not.toContain("tooltip one");
  });
});

