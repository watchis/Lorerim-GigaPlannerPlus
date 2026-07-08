/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VariantSelectField } from "@/components/VariantSelectField";

describe("VariantSelectField", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    container?.remove();
    root = null;
    container = null;
  });

  it("renders the shared variant select label and child control", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        createElement(
          VariantSelectField,
          {
            label: "Variants",
            children: createElement("button", { type: "button" }, "Select variant"),
          },
        ),
      );
    });

    expect(container.textContent).toContain("Variants");
    expect(container.querySelector("button")).not.toBeNull();
    expect(container.querySelector(".space-y-1\\.5")).not.toBeNull();
  });
});
