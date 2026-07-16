/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NumericLevelInput } from "@/components/NumericLevelInput";

describe("NumericLevelInput", () => {
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

  it("exposes aria-label on the level input", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(NumericLevelInput, {
          value: 5,
          min: 1,
          max: 10,
          onCommit: vi.fn(),
          "aria-label": "Level",
        }),
      );
    });

    const input = container.querySelector('input[aria-label="Level"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("5");
    expect((input as HTMLInputElement).inputMode).toBe("numeric");
  });
});
