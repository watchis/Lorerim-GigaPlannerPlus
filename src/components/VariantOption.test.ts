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
    expect(nameEl?.parentElement?.className).toContain("grid-cols-[minmax(0,1fr)_auto]");
  });

  it("always renders the level chip beside the variant name", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        createElement(VariantOption, {
          name: "Another Very Long Build Variant Name",
          levelText: "Lv 42",
        }),
      );
    });

    const levelChip = container.querySelector("[data-variant-level-chip]");
    expect(levelChip).not.toBeNull();
    expect(levelChip!.textContent).toBe("Lv 42");
  });
});
