import { describe, expect, it } from "vitest";
import { stripHtml } from "./stripHtml";

describe("stripHtml", () => {
  it("returns plain text unchanged", () => {
    expect(stripHtml("Deal 25% more damage.")).toBe("Deal 25% more damage.");
  });

  it("removes simple tags", () => {
    expect(stripHtml("<b>Bold</b> and <i>italic</i>")).toBe("Bold and italic");
  });

  it("converts br tags to newlines", () => {
    expect(stripHtml("Line one<br>Line two<br/>Line three<br />Line four")).toBe(
      "Line one\nLine two\nLine three\nLine four",
    );
  });

  it("removes every angle bracket so nested tag-like input cannot re-form tags", () => {
    for (const input of [
      "<scrip<script>t>alert(1)</script>",
      "<<script>script>alert(1)<</script>/script>",
      "<!-- comment --><b>text</b>",
    ]) {
      const output = stripHtml(input);
      expect(output).not.toContain("<");
      expect(output).not.toMatch(/<script/i);
    }

    expect(stripHtml("<scrip<script>t>alert(1)</script>")).toBe("t>alert(1)");
    expect(stripHtml("<<script>script>alert(1)<</script>/script>")).toBe(
      "script>alert(1)/script>",
    );
  });

  it("drops content after an unclosed tag", () => {
    expect(stripHtml("Hello <span world")).toBe("Hello ");
  });
});
