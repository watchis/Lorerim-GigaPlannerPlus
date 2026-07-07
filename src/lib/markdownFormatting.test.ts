import { describe, expect, it } from "vitest";
import {
  applyMarkdownLinePrefix,
  applyMarkdownLink,
  applyMarkdownWrap,
} from "@/lib/markdownFormatting";

describe("markdownFormatting", () => {
  it("wraps the selected text", () => {
    const result = applyMarkdownWrap("hello world", { start: 6, end: 11 }, "**", "**");

    expect(result.value).toBe("hello **world**");
    expect(result.selectionStart).toBe(8);
    expect(result.selectionEnd).toBe(13);
  });

  it("inserts placeholder text when nothing is selected", () => {
    const result = applyMarkdownWrap("hello", { start: 5, end: 5 }, "*", "*", "italic");

    expect(result.value).toBe("hello*italic*");
    expect(result.selectionStart).toBe(6);
    expect(result.selectionEnd).toBe(12);
  });

  it("creates a markdown link and selects the url", () => {
    const result = applyMarkdownLink("Check docs", { start: 6, end: 10 });

    expect(result.value).toBe("Check [docs](https://)");
    expect(result.selectionStart).toBe(13);
    expect(result.selectionEnd).toBe(21);
  });

  it("prefixes each selected line for bullet lists", () => {
    const result = applyMarkdownLinePrefix("one\ntwo\nthree", { start: 4, end: 7 }, "- ");

    expect(result.value).toBe("one\n- two\nthree");
    expect(result.selectionStart).toBe(4);
    expect(result.selectionEnd).toBe(9);
  });
});
