/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VariantOption } from "@/components/VariantOption";

describe("VariantOption", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    container?.remove();
    root = null;
    container = null;
  });

  it("truncates long variant names in the trigger and menu layout", () => {
    const longName = "Very Long Build Variant Name That Should Not Overflow";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(createElement(VariantOption, { name: longName, levelText: "Lv 50" }));
    });

    const nameEl = container.querySelector(".truncate");
    expect(nameEl).not.toBeNull();
    expect(nameEl!.textContent).toBe(longName);
    expect(nameEl?.parentElement?.className).toContain("min-w-0");
  });
});
