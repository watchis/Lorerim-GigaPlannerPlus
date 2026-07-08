/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { getTestAppData } from "@/test/helpers";
import { BUG_REPORT_URL } from "@/lib/bugReport";

const appData = getTestAppData();

describe("AppShell mobile navigation", () => {
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

  it("closes the mobile menu when clicking outside of it", () => {
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

    expect(document.getElementById("mobile-nav")).toBeTruthy();

    const main = document.querySelector("main");
    expect(main).toBeTruthy();

    act(() => {
      main?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(document.getElementById("mobile-nav")).toBeNull();
    expect(document.querySelector('button[aria-label="Open menu"]')).toBeTruthy();
  });
});
