import { describe, expect, it } from "vitest";
import {
  applyMarkdownCodeBlock,
  applyMarkdownHeading,
  applyMarkdownHorizontalRule,
  applyMarkdownImage,
  applyMarkdownLinePrefix,
  applyMarkdownLink,
  applyMarkdownNormalText,
  applyMarkdownOrderedList,
  applyMarkdownWrap,
  applyVariantNotesFormat,
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

  it("removes bold formatting when reapplied to wrapped text", () => {
    const result = applyMarkdownWrap("**text**", { start: 0, end: 8 }, "**", "**");

    expect(result.value).toBe("text");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(4);
  });

  it("removes bold formatting when the selection is inside wrapped text", () => {
    const result = applyMarkdownWrap("**text**", { start: 3, end: 3 }, "**", "**");

    expect(result.value).toBe("text");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(4);
  });

  it("removes bold formatting when only the inner word is selected", () => {
    const result = applyMarkdownWrap("**text**", { start: 2, end: 6 }, "**", "**");

    expect(result.value).toBe("text");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(4);
  });

  it("creates a markdown link and selects the url", () => {
    const result = applyMarkdownLink("Check docs", { start: 6, end: 10 });

    expect(result.value).toBe("Check [docs](https://)");
    expect(result.selectionStart).toBe(13);
    expect(result.selectionEnd).toBe(21);
  });

  it("removes a markdown link when link formatting is reapplied", () => {
    const result = applyMarkdownLink("See [docs](https://example.com) now", { start: 5, end: 31 });

    expect(result.value).toBe("See docs now");
    expect(result.selectionStart).toBe(4);
    expect(result.selectionEnd).toBe(8);
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

  it("removes bullet list prefixes when reapplied", () => {
    const result = applyMarkdownLinePrefix("- one\n- two", { start: 0, end: 12 }, "- ");

    expect(result.value).toBe("one\ntwo");
  });

  it("prefixes selected lines for blockquotes", () => {
    const result = applyMarkdownLinePrefix("quote me", { start: 0, end: 8 }, "> ");

    expect(result.value).toBe("> quote me");
  });

  it("numbers selected lines for ordered lists", () => {
    const result = applyMarkdownOrderedList("first\nsecond", { start: 0, end: 11 });

    expect(result.value).toBe("1. first\n2. second");
  });

  it("removes ordered list prefixes when reapplied", () => {
    const result = applyMarkdownOrderedList("1. first\n2. second", { start: 0, end: 18 });

    expect(result.value).toBe("first\nsecond");
  });

  it("replaces an existing heading prefix on the selected line", () => {
    const result = applyMarkdownHeading("## Old title", { start: 3, end: 12 }, 1);

    expect(result.value).toBe("# Old title");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(11);
  });

  it("removes a heading when the same level is reapplied", () => {
    const result = applyMarkdownHeading("## Heading", { start: 0, end: 10 }, 2);

    expect(result.value).toBe("Heading");
  });

  it("removes heading prefixes for normal text", () => {
    const result = applyMarkdownNormalText("## Heading\n### Another", { start: 0, end: 20 });

    expect(result.value).toBe("Heading\nAnother");
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

  it("removes a fenced code block when reapplied", () => {
    const result = applyMarkdownCodeBlock("```\nconst x = 1;\n```", { start: 4, end: 4 });

    expect(result.value).toBe("const x = 1;");
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(12);
  });

  it("inserts a horizontal rule with surrounding breaks", () => {
    const result = applyMarkdownHorizontalRule("Above\nBelow", { start: 6, end: 6 });

    expect(result.value).toBe("Above\n\n---\n\nBelow");
    expect(result.selectionStart).toBe(7);
    expect(result.selectionEnd).toBe(10);
  });

  it("routes bold formatting through applyVariantNotesFormat", () => {
    const wrapped = applyVariantNotesFormat("bold", "text", { start: 0, end: 4 });
    expect(wrapped.value).toBe("**text**");

    const unwrapped = applyVariantNotesFormat("bold", wrapped.value, {
      start: wrapped.selectionStart,
      end: wrapped.selectionEnd,
    });
    expect(unwrapped.value).toBe("text");
  });
});
