import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TooltipProvider, HoverTapTooltip, CursorTooltip } from "@/components/ui/tooltip";
import { claimExclusiveTouchOverlay } from "@/components/ui/tooltip";

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

  it("closes a CursorTooltip when a HoverTapTooltip opens (touch singleton across types)", () => {
    mockMatchMedia((query) => query === "(hover: hover) and (pointer: fine)" ? false : false);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function Fixture() {
      const [bannerOpen, setBannerOpen] = useState(false);
      const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

      return (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <div>
            <CursorTooltip
              open={bannerOpen}
              onOpenChange={setBannerOpen}
              touchAnchor={anchor}
              content="build issues tooltip"
            >
              <button
                type="button"
                aria-label="banner"
                onClick={(event) => {
                  setAnchor({ x: event.clientX, y: event.clientY });
                  setBannerOpen((value) => !value);
                }}
              >
                banner
              </button>
            </CursorTooltip>

            <HoverTapTooltip content="wallet tooltip">
              <button type="button" aria-label="wallet">
                wallet
              </button>
            </HoverTapTooltip>
          </div>
        </TooltipProvider>
      );
    }

    act(() => {
      root?.render(<Fixture />);
    });

    const bannerButton = document.querySelector('button[aria-label="banner"]');
    const walletButton = document.querySelector('button[aria-label="wallet"]');
    expect(bannerButton).toBeTruthy();
    expect(walletButton).toBeTruthy();

    act(() => {
      bannerButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, clientX: 10, clientY: 10 }),
      );
    });
    expect(document.body.textContent).toContain("build issues tooltip");

    act(() => {
      walletButton?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }),
      );
    });
    expect(document.body.textContent).toContain("wallet tooltip");
    expect(document.body.textContent).not.toContain("build issues tooltip");
  });

  it("allows a CursorTooltip to open when no other tooltip is active", () => {
    mockMatchMedia((query) => query === "(hover: hover) and (pointer: fine)" ? false : false);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function Fixture() {
      const [open, setOpen] = useState(false);
      return (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <CursorTooltip
            open={open}
            onOpenChange={setOpen}
            touchAnchor={{ x: 10, y: 10 }}
            content="banner tooltip"
          >
            <button type="button" aria-label="banner" onClick={() => setOpen((v) => !v)}>
              banner
            </button>
          </CursorTooltip>
        </TooltipProvider>
      );
    }

    act(() => {
      root?.render(<Fixture />);
    });

    const bannerButton = document.querySelector('button[aria-label="banner"]');
    expect(bannerButton).toBeTruthy();

    act(() => {
      bannerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("banner tooltip");
  });

  it("closes an open CursorTooltip when another exclusive touch overlay claims focus", () => {
    mockMatchMedia((query) => query === "(hover: hover) and (pointer: fine)" ? false : false);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function Fixture() {
      const [open, setOpen] = useState(false);
      return (
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <CursorTooltip
            open={open}
            onOpenChange={setOpen}
            touchAnchor={{ x: 10, y: 10 }}
            content="banner tooltip"
          >
            <button type="button" aria-label="banner" onClick={() => setOpen(true)}>
              banner
            </button>
          </CursorTooltip>
          <button
            type="button"
            aria-label="wallet"
            onClick={() => claimExclusiveTouchOverlay("budget-dropdown")}
          >
            wallet
          </button>
        </TooltipProvider>
      );
    }

    act(() => {
      root?.render(<Fixture />);
    });

    const bannerButton = document.querySelector('button[aria-label="banner"]');
    const walletButton = document.querySelector('button[aria-label="wallet"]');
    expect(bannerButton).toBeTruthy();
    expect(walletButton).toBeTruthy();

    act(() => {
      bannerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("banner tooltip");

    act(() => {
      walletButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).not.toContain("banner tooltip");
  });
});

