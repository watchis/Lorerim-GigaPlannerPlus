import { useRef, type ReactNode, type RefObject } from "react";
import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applyMarkdownLinePrefix,
  applyMarkdownLink,
  applyMarkdownWrap,
  type TextEditResult,
} from "@/lib/markdownFormatting";

type MarkdownFormat = "bold" | "italic" | "strikethrough" | "code" | "link" | "list";

interface VariantNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  toolbarRef?: RefObject<HTMLDivElement | null>;
  showToolbar?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function applyFormatToNotes(
  format: MarkdownFormat,
  textarea: HTMLTextAreaElement,
  value: string,
): TextEditResult {
  const selection = {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };

  switch (format) {
    case "bold":
      return applyMarkdownWrap(value, selection, "**", "**", "bold");
    case "italic":
      return applyMarkdownWrap(value, selection, "*", "*", "italic");
    case "strikethrough":
      return applyMarkdownWrap(value, selection, "~~", "~~", "strike");
    case "code":
      return applyMarkdownWrap(value, selection, "`", "`", "code");
    case "link":
      return applyMarkdownLink(value, selection);
    case "list":
      return applyMarkdownLinePrefix(value, selection, "- ");
  }
}

export function VariantNotesToolbar({
  value,
  onChange,
  disabled,
  textareaRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  className?: string;
}) {
  const applyFormat = (format: MarkdownFormat) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const result = applyFormatToNotes(format, textarea, value);
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 overflow-x-auto",
        className,
      )}
    >
      <ToolbarButton label="Bold" onClick={() => applyFormat("bold")} disabled={disabled}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => applyFormat("italic")} disabled={disabled}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        onClick={() => applyFormat("strikethrough")}
        disabled={disabled}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Code" onClick={() => applyFormat("code")} disabled={disabled}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Link" onClick={() => applyFormat("link")} disabled={disabled}>
        <Link className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Bullet list" onClick={() => applyFormat("list")} disabled={disabled}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

export function VariantNotesEditor({
  value,
  onChange,
  placeholder,
  disabled,
  toolbarRef,
  showToolbar = true,
  textareaRef: externalTextareaRef,
}: VariantNotesEditorProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-1"
        >
          <VariantNotesToolbar
            value={value}
            onChange={onChange}
            disabled={disabled}
            textareaRef={textareaRef}
          />
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "min-h-0 flex-1 resize-none rounded-[var(--radius-md)] border bg-[var(--color-surface-elevated)]/60 px-3 py-2 font-mono text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
          disabled && "opacity-60",
        )}
      />
    </div>
  );
}

export function useVariantNotesTextareaRef() {
  return useRef<HTMLTextAreaElement>(null);
}
