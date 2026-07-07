import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import {
  Bold,
  Code,
  Heading,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatShortcutLabel, resolveMarkdownShortcut } from "@/lib/markdownKeybindings";
import {
  applyVariantNotesFormat,
  type MarkdownFormat,
  type TextEditResult,
} from "@/lib/markdownFormatting";

interface VariantNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  toolbarRef?: RefObject<HTMLDivElement | null>;
  showToolbar?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

function applyFormatToTextarea(
  format: MarkdownFormat,
  textarea: HTMLTextAreaElement,
  value: string,
): TextEditResult {
  return applyVariantNotesFormat(format, value, {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  });
}

export function commitVariantNotesFormat(
  format: MarkdownFormat,
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (value: string) => void,
): void {
  const result = applyFormatToTextarea(format, textarea, value);
  onChange(result.value);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  });
}

const toolbarLayoutStyle = {
  "--toolbar-gap": "clamp(0.125rem, 0.75vw, 0.3125rem)",
  "--toolbar-btn": "clamp(1.625rem, 1.625rem + 0.25vw, 1.75rem)",
  "--toolbar-icon": "1rem",
} as CSSProperties;

function ToolbarDivider() {
  return (
    <div
      className="mx-[calc(var(--toolbar-gap)/2)] h-[calc(var(--toolbar-btn)*0.62)] w-px shrink-0 bg-[var(--color-border)]/80"
      aria-hidden
    />
  );
}

const toolbarButtonClass =
  "size-[var(--toolbar-btn)] min-h-0 min-w-0 shrink-0 rounded-sm p-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]";
const toolbarIconClass = "size-[var(--toolbar-icon)] shrink-0";

function ToolbarButton({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={toolbarButtonClass}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
    >
      {children}
    </Button>
  );
}

function VariantNotesToolbarControls({
  value,
  onChange,
  disabled,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [headingSelectKey, setHeadingSelectKey] = useState(0);

  const applyFormat = (format: MarkdownFormat) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;
    commitVariantNotesFormat(format, textarea, value, onChange);
  };

  const applyHeading = (level: string) => {
    if (level === "normal") {
      applyFormat("normalText");
    } else {
      applyFormat(`heading-${Number(level) as 1 | 2 | 3 | 4 | 5 | 6}`);
    }
    setHeadingSelectKey((current) => current + 1);
  };

  return (
    <>
      <Select key={headingSelectKey} onValueChange={applyHeading} disabled={disabled}>
        <SelectTrigger
          className={cn(
            toolbarButtonClass,
            "justify-center gap-0 border-0 bg-transparent shadow-none focus:ring-0 [&>span]:hidden",
          )}
          aria-label="Text style"
          title="Text style"
        >
          <Heading className={cn(toolbarIconClass, "shrink-0")} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          className="z-[80] max-h-[min(50vh,20rem)] min-w-[8rem] text-sm"
        >
          <SelectItem value="normal">Normal text</SelectItem>
          <SelectItem value="1">Heading 1</SelectItem>
          <SelectItem value="2">Heading 2</SelectItem>
          <SelectItem value="3">Heading 3</SelectItem>
          <SelectItem value="4">Heading 4</SelectItem>
          <SelectItem value="5">Heading 5</SelectItem>
          <SelectItem value="6">Heading 6</SelectItem>
        </SelectContent>
      </Select>

      <ToolbarDivider />

      <ToolbarButton
        label="Bold"
        shortcut={formatShortcutLabel("bold")}
        onClick={() => applyFormat("bold")}
        disabled={disabled}
      >
        <Bold className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut={formatShortcutLabel("italic")}
        onClick={() => applyFormat("italic")}
        disabled={disabled}
      >
        <Italic className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        shortcut={formatShortcutLabel("strikethrough")}
        onClick={() => applyFormat("strikethrough")}
        disabled={disabled}
      >
        <Strikethrough className={toolbarIconClass} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Inline code"
        shortcut={formatShortcutLabel("code")}
        onClick={() => applyFormat("code")}
        disabled={disabled}
      >
        <Code className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        shortcut={formatShortcutLabel("codeBlock")}
        onClick={() => applyFormat("codeBlock")}
        disabled={disabled}
      >
        <span className="font-mono text-[9px] leading-none">{"{ }"}</span>
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        shortcut={formatShortcutLabel("link")}
        onClick={() => applyFormat("link")}
        disabled={disabled}
      >
        <Link className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={() => applyFormat("image")} disabled={disabled}>
        <Image className={toolbarIconClass} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bullet list"
        shortcut={formatShortcutLabel("list")}
        onClick={() => applyFormat("list")}
        disabled={disabled}
      >
        <List className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        shortcut={formatShortcutLabel("orderedList")}
        onClick={() => applyFormat("orderedList")}
        disabled={disabled}
      >
        <ListOrdered className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        shortcut={formatShortcutLabel("blockquote")}
        onClick={() => applyFormat("blockquote")}
        disabled={disabled}
      >
        <Quote className={toolbarIconClass} />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => applyFormat("horizontalRule")}
        disabled={disabled}
      >
        <Minus className={toolbarIconClass} />
      </ToolbarButton>
    </>
  );
}

export function VariantNotesToolbar({
  value,
  onChange,
  disabled,
  textareaRef,
  className,
  framed = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  className?: string;
  framed?: boolean;
}) {
  return (
    <div
      style={toolbarLayoutStyle}
      className={cn(
        "flex w-full min-w-0 flex-nowrap items-center gap-[var(--toolbar-gap)] overflow-x-auto overscroll-x-contain",
        framed &&
          "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-0.5 py-px",
        className,
      )}
    >
      <VariantNotesToolbarControls
        value={value}
        onChange={onChange}
        disabled={disabled}
        textareaRef={textareaRef}
      />
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

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    const format = resolveMarkdownShortcut(event);
    if (!format) return;

    event.preventDefault();
    commitVariantNotesFormat(format, event.currentTarget, value, onChange);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      {showToolbar && (
        <div ref={toolbarRef}>
          <VariantNotesToolbar
            value={value}
            onChange={onChange}
            disabled={disabled}
            textareaRef={textareaRef}
            framed
          />
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
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
