import { describe, expect, it } from "vitest";
import { resolveMarkdownShortcut, type MarkdownShortcutEvent } from "@/lib/markdownKeybindings";

function shortcut(init: MarkdownShortcutEvent) {
  return resolveMarkdownShortcut(init);
}

describe("markdownKeybindings", () => {
  it("ignores shortcuts without a primary modifier", () => {
    expect(shortcut({ key: "b" })).toBeNull();
  });

  it("maps common markdown shortcuts", () => {
    expect(shortcut({ key: "b", ctrlKey: true })).toBe("bold");
    expect(shortcut({ key: "i", metaKey: true })).toBe("italic");
    expect(shortcut({ key: "k", ctrlKey: true })).toBe("link");
    expect(shortcut({ key: "e", ctrlKey: true })).toBe("code");
    expect(shortcut({ key: "E", ctrlKey: true, shiftKey: true })).toBe("codeBlock");
    expect(shortcut({ key: "8", ctrlKey: true, shiftKey: true })).toBe("list");
    expect(shortcut({ key: "2", ctrlKey: true, altKey: true })).toBe("heading-2");
    expect(shortcut({ key: "0", ctrlKey: true, altKey: true })).toBe("normalText");
  });

  it("maps strikethrough and blockquote shortcuts", () => {
    expect(shortcut({ key: "x", ctrlKey: true, shiftKey: true })).toBe("strikethrough");
    expect(shortcut({ key: ".", ctrlKey: true, shiftKey: true })).toBe("blockquote");
  });
});
