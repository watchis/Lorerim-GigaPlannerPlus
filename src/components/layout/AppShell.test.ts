/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { getTestAppData } from "@/test/helpers";
import { BUG_REPORT_URL } from "@/lib/bugReport";

const appData = getTestAppData();

async function flushDeferredOutsideListener() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
  });
}

function isMobileMenuOpen(): boolean {
  const nav = document.getElementById("mobile-nav");
  return nav != null && !nav.hasAttribute("hidden");
}

describe("AppShell mobile navigation", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    vi.useRealTimers();
    if (root) {
      act(() => root?.unmount());
    }
    root = null;
    container?.remove();
    container = null;
    document.body.innerHTML = "";
  });

  it("shows a Report a bug link in the mobile menu", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(AppShell),
          ),
        ),
      );
    });

    const menuButton = document.querySelector('button[aria-label="Open menu"]');
    expect(menuButton).toBeTruthy();

    act(() => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const reportLink = document.querySelector(`a[href="${BUG_REPORT_URL}"]`);
    expect(reportLink).toBeTruthy();
    expect(reportLink?.textContent).toContain(appData.ui.labels.nav.reportBug);
    expect(reportLink?.getAttribute("target")).toBe("_blank");
    expect(reportLink?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("closes the mobile menu when clicking outside of it", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(AppShell),
          ),
        ),
      );
    });

    const menuButton = document.querySelector('button[aria-label="Open menu"]');
    expect(menuButton).toBeTruthy();

    act(() => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(isMobileMenuOpen()).toBe(true);

    await flushDeferredOutsideListener();

    const main = document.querySelector("main");
    expect(main).toBeTruthy();

    act(() => {
      main?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(isMobileMenuOpen()).toBe(false);
    expect(document.querySelector('button[aria-label="Open menu"]')).toBeTruthy();
  });

  it("processes outside clicks before closing the mobile menu", async () => {
    let outsideClicked = false;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(
              Routes,
              null,
              createElement(
                Route,
                { element: createElement(AppShell) },
                createElement(Route, {
                  index: true,
                  element: createElement("button", {
                    type: "button",
                    "data-testid": "outside-target",
                    onClick: () => {
                      outsideClicked = true;
                    },
                  }),
                }),
              ),
            ),
          ),
        ),
      );
    });

    const menuButton = document.querySelector('button[aria-label="Open menu"]');
    expect(menuButton).toBeTruthy();

    act(() => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await flushDeferredOutsideListener();

    const outsideTarget = document.querySelector('[data-testid="outside-target"]');
    expect(outsideTarget).toBeTruthy();

    act(() => {
      outsideTarget?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(outsideClicked).toBe(true);
    expect(isMobileMenuOpen()).toBe(false);
  });

  function getMenuButton() {
    return document.querySelector(
      'button[aria-label="Open menu"], button[aria-label="Close menu"]',
    );
  }

  it("can be reopened after being opened and closed via the toggle", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(AppShell),
          ),
        ),
      );
    });

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(false);

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);
  });

  it("can be reopened after being opened and closed via an outside click", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(AppShell),
          ),
        ),
      );
    });

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);

    await flushDeferredOutsideListener();

    act(() => {
      document.querySelector("main")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(false);

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);
  });

  describe("deferred outside click listener", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not attach until after the opening click", () => {
    vi.useFakeTimers();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(AppShell),
          ),
        ),
      );
    });

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);

    act(() => {
      document.querySelector("main")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      document.querySelector("main")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(false);
    });
  });

  it("closes the mobile menu after navigating via a nav link", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(
          ThemeProvider,
          { theme: appData.ui.theme, labels: appData.ui.labels },
          createElement(
            MemoryRouter,
            { initialEntries: ["/"] },
            createElement(
              Routes,
              null,
              createElement(
                Route,
                { element: createElement(AppShell) },
                createElement(Route, { index: true, element: createElement("div", null, "home") }),
                createElement(Route, {
                  path: "planner",
                  element: createElement("div", null, "planner"),
                }),
              ),
            ),
          ),
        ),
      );
    });

    act(() => {
      getMenuButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(isMobileMenuOpen()).toBe(true);

    const plannerLink = document.querySelector('a[href="/planner"]');
    expect(plannerLink).toBeTruthy();

    await act(async () => {
      plannerLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(isMobileMenuOpen()).toBe(false);
    expect(document.body.textContent).toContain("planner");
  });
});
