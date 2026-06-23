import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { getTextareaCaretOffset } from "@/lib/caretPosition";
import { getJsonKeyContext } from "@/lib/jsonKeyContext";
import { tokenizeJson, type JsonTokenType } from "@/lib/highlightJson";

const tokenClassName: Record<JsonTokenType, string> = {
  key: "json-token-key",
  string: "json-token-string",
  number: "json-token-number",
  literal: "json-token-literal",
  punctuation: "json-token-punctuation",
  plain: "",
};

const MAX_SUGGESTIONS = 8;

function filterKeySuggestions(suggestions: string[], prefix: string): string[] {
  const normalized = prefix.toLowerCase();
  return suggestions
    .filter((suggestion) => {
      if (suggestion === prefix) return false;
      if (!normalized) return true;
      return suggestion.toLowerCase().startsWith(normalized);
    })
    .slice(0, MAX_SUGGESTIONS);
}

export function JsonRawEditor({
  value,
  onChange,
  keySuggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  keySuggestions: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const tokens = useMemo(() => tokenizeJson(value), [value]);

  const [cursor, setCursor] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const keyContext = useMemo(() => getJsonKeyContext(value, cursor), [value, cursor]);
  const visibleSuggestions = useMemo(
    () => (keyContext ? filterKeySuggestions(keySuggestions, keyContext.prefix) : []),
    [keyContext, keySuggestions],
  );
  const menuOpen = keyContext !== null && visibleSuggestions.length > 0 && !menuDismissed;

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }, []);

  const readCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    setCursor(textarea.selectionStart);
  }, []);

  const applySuggestion = useCallback(
    (suggestion: string) => {
      if (!keyContext) return;
      const nextValue = `${value.slice(0, keyContext.start)}${suggestion}${value.slice(keyContext.end)}`;
      const nextCursor = keyContext.start + suggestion.length;
      pendingCursorRef.current = nextCursor;
      onChange(nextValue);
      setActiveIndex(0);
    },
    [keyContext, onChange, value],
  );

  useLayoutEffect(() => {
    const nextCursor = pendingCursorRef.current;
    if (nextCursor === null) return;
    pendingCursorRef.current = null;

    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
    setCursor(nextCursor);
  }, [value]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const offset = getTextareaCaretOffset(textarea, cursor);
    setMenuPosition({
      top: offset.top + 20,
      left: offset.left,
    });
  }, [cursor, menuOpen, value]);

  useEffect(() => {
    setActiveIndex(0);
    setMenuDismissed(false);
  }, [keyContext?.start, keyContext?.prefix]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!menuOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % visibleSuggestions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + visibleSuggestions.length) % visibleSuggestions.length);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMenuDismissed(true);
        return;
      }

      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        applySuggestion(visibleSuggestions[activeIndex] ?? visibleSuggestions[0]);
      }
    },
    [activeIndex, applySuggestion, menuOpen, visibleSuggestions],
  );

  return (
    <div className="json-raw-editor">
      <pre ref={highlightRef} aria-hidden className="json-raw-surface json-raw-highlight">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={tokenClassName[token.type]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={readCursor}
        onClick={readCursor}
        onSelect={readCursor}
        onScroll={syncScroll}
        spellCheck={false}
        className="json-raw-surface json-raw-input"
      />
      {menuOpen && menuPosition && (
        <ul
          className="json-raw-suggestions absolute z-[2] max-h-48 min-w-[10rem] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-panel)]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          role="listbox"
          aria-label="JSON key suggestions"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <li key={suggestion} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "w-full px-2.5 py-1.5 text-left font-mono text-xs transition-colors duration-150",
                  index === activeIndex
                    ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applySuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
