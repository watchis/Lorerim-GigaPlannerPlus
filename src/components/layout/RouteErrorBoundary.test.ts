/**
 * @vitest-environment jsdom
 */
import { createElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

function Boom(): never {
  throw new Error("render boom");
}

function SafeChild({ label }: { label: string }) {
  return createElement("div", null, label);
}

describe("RouteErrorBoundary", () => {
  it("shows an error screen when a child throws, then recovers via Try again", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    function Harness({ blowUp }: { blowUp: boolean }) {
      return createElement(
        MemoryRouter,
        null,
        createElement(
          RouteErrorBoundary,
          { resetKey: "builds" },
          blowUp ? createElement(Boom) : createElement(SafeChild, { label: "recovered" }),
        ),
      );
    }

    await act(async () => {
      root.render(createElement(Harness, { blowUp: true }));
    });

    expect(container.textContent).toContain("Something went wrong on this page");
    expect(container.textContent).toContain("render boom");
    expect(container.textContent).toContain("Try again");
    expect(container.textContent).toContain("Open planner");

    await act(async () => {
      root.render(createElement(Harness, { blowUp: false }));
    });
    await act(async () => {
      const retry = Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Try again"),
      );
      retry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("recovered");
    expect(container.textContent).not.toContain("render boom");

    consoleError.mockRestore();
    root.unmount();
    container.remove();
  });

  it("clears the error when resetKey changes after navigation", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    function Harness() {
      const [key, setKey] = useState("builds");
      const [showBoom, setShowBoom] = useState(true);
      return createElement(
        MemoryRouter,
        null,
        createElement(
          "div",
          null,
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                setShowBoom(false);
                setKey("planner");
              },
            },
            "go-planner",
          ),
          createElement(
            RouteErrorBoundary,
            { resetKey: key },
            showBoom ? createElement(Boom) : createElement(SafeChild, { label: "planner ok" }),
          ),
        ),
      );
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    expect(container.textContent).toContain("render boom");

    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("planner ok");
    expect(container.textContent).not.toContain("render boom");

    consoleError.mockRestore();
    root.unmount();
    container.remove();
  });
});
