function isBreakTag(tagBody: string): boolean {
  return /^br\s*\/?$/i.test(tagBody);
}

/**
 * Strip HTML tags from perk description text for plain-text tooltips.
 * Uses a character scan instead of regex tag removal to avoid incomplete
 * multi-character sanitization (e.g. `<scrip<script>t>`).
 */
export function stripHtml(html: string): string {
  let output = "";

  for (let index = 0; index < html.length; index++) {
    const char = html[index];
    if (char !== "<") {
      output += char;
      continue;
    }

    const closeIndex = html.indexOf(">", index + 1);
    if (closeIndex === -1) break;

    const tagBody = html.slice(index + 1, closeIndex);
    if (isBreakTag(tagBody)) {
      output += "\n";
    }

    index = closeIndex;
  }

  return output;
}
