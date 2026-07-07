import type { MarkdownFormat } from "@/lib/markdownFormatting";

export interface MarkdownShortcutEvent {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

function hasPrimaryModifier(event: MarkdownShortcutEvent): boolean {
  return Boolean(event.metaKey || event.ctrlKey);
}

export function resolveMarkdownShortcut(event: MarkdownShortcutEvent): MarkdownFormat | null {
  if (!hasPrimaryModifier(event)) return null;

  const key = event.key.toLowerCase();

  if (!event.shiftKey && key === "b") return "bold";
  if (!event.shiftKey && key === "i") return "italic";
  if (event.shiftKey && key === "x") return "strikethrough";
  if (!event.shiftKey && key === "k") return "link";
  if (!event.shiftKey && (key === "e" || event.key === "`")) return "code";
  if (event.shiftKey && (key === "e" || event.key === "`")) return "codeBlock";
  if (event.shiftKey && key === "8") return "list";
  if (event.shiftKey && key === "7") return "orderedList";
  if (event.shiftKey && (key === "." || key === ">")) return "blockquote";
  if (event.altKey && key >= "1" && key <= "6") {
    return `heading-${Number(key) as 1 | 2 | 3 | 4 | 5 | 6}`;
  }
  if (event.altKey && key === "0") return "normalText";

  return null;
}

export function formatShortcutLabel(format: MarkdownFormat): string | undefined {
  const mod = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

  switch (format) {
    case "bold":
      return `${mod}+B`;
    case "italic":
      return `${mod}+I`;
    case "strikethrough":
      return `${mod}+Shift+X`;
    case "link":
      return `${mod}+K`;
    case "code":
      return `${mod}+E`;
    case "codeBlock":
      return `${mod}+Shift+E`;
    case "list":
      return `${mod}+Shift+8`;
    case "orderedList":
      return `${mod}+Shift+7`;
    case "blockquote":
      return `${mod}+Shift+.`;
    default:
      return undefined;
  }
}
