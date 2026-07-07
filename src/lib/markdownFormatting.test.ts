import { describe, expect, it } from "vitest";
import {
  applyMarkdownCodeBlock,
  applyMarkdownHeading,
  applyMarkdownHorizontalRule,
  applyMarkdownImage,
  applyMarkdownLinePrefix,
  applyMarkdownLink,
  applyMarkdownOrderedList,
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

  it("creates a markdown image and selects the url", () => {
    const result = applyMarkdownImage("A logo", { start: 2, end: 6 });

    expect(result.value).toBe("A ![logo](https://)");
    expect(result.selectionStart).toBe(10);
    expect(result.selectionEnd).toBe(18);
  });

  it("prefixes each selected line for bullet lists", () => {
    const result = applyMarkdownLinePrefix("one\ntwo\nthree", { start: 4, end: 7 }, "- ");

    expect(result.value).toBe("one\n- two\nthree");
    expect(result.selectionStart).toBe(4);
    expect(result.selectionEnd).toBe(9);
  });

  it("prefixes selected lines for blockquotes", () => {
    const result = applyMarkdownLinePrefix("quote me", { start: 0, end: 8 }, "> ");

    expect(result.value).toBe("> quote me");
  });

  it("numbers selected lines for ordered lists", () => {
    const result = applyMarkdownOrderedList("first\nsecond", { start: 0, end: 11 });

    expect(result.value).toBe("1. first\n2. second");
  });

  it("replaces an existing heading prefix on the selected line", () => {
    const result = applyMarkdownHeading("## Old title", { start: 3, end: 12 }, 1);

    expect(result.value).toBe("# Old title");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(11);
  });

  it("applies headings to every line in the selection", () => {
    const result = applyMarkdownHeading("Line one\nLine two", { start: 0, end: 16 }, 3);

    expect(result.value).toBe("### Line one\n### Line two");
  });

  it("wraps selected text in a fenced code block", () => {
    const result = applyMarkdownCodeBlock("const x = 1;", { start: 0, end: 12 });

    expect(result.value).toBe("```\nconst x = 1;\n```");
    expect(result.selectionStart).toBe(4);
    expect(result.selectionEnd).toBe(16);
  });

  it("inserts a horizontal rule with surrounding breaks", () => {
    const result = applyMarkdownHorizontalRule("Above\nBelow", { start: 6, end: 6 });

    expect(result.value).toBe("Above\n\n---\n\nBelow");
    expect(result.selectionStart).toBe(7);
    expect(result.selectionEnd).toBe(10);
  });
});
