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
import { shouldShowMarkdownToolbarDivider } from "@/lib/markdownToolbarPriority";
import { useResponsiveMarkdownToolbar } from "@/lib/useResponsiveMarkdownToolbar";
import { formatShortcutLabel, resolveMarkdownShortcut } from "@/lib/markdownKeybindings";
import {
  applyVariantNotesFormat,
  type MarkdownFormat,
  type TextEditResult,
} from "@/lib/markdownFormatting";
import type { MarkdownToolbarItemId } from "@/lib/markdownToolbarPriority";

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
  itemId,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  itemId: MarkdownToolbarItemId;
  children: ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-toolbar-item={itemId}
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
  isItemVisible,
  hiddenItems,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isItemVisible: (itemId: MarkdownToolbarItemId) => boolean;
  hiddenItems: ReadonlySet<MarkdownToolbarItemId>;
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
      {isItemVisible("heading") && (
        <Select key={headingSelectKey} onValueChange={applyHeading} disabled={disabled}>
          <SelectTrigger
            data-toolbar-item="heading"
            className={cn(
              toolbarButtonClass,
              "justify-center gap-0 border-0 bg-transparent shadow-none focus:ring-0 [&>svg:last-child]:hidden",
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
      )}

      {isItemVisible("bold") && (
        <ToolbarButton
          label="Bold"
          itemId="bold"
          shortcut={formatShortcutLabel("bold")}
          onClick={() => applyFormat("bold")}
          disabled={disabled}
        >
          <Bold className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("italic") && (
        <ToolbarButton
          label="Italic"
          itemId="italic"
          shortcut={formatShortcutLabel("italic")}
          onClick={() => applyFormat("italic")}
          disabled={disabled}
        >
          <Italic className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("strikethrough") && (
        <ToolbarButton
          label="Strikethrough"
          itemId="strikethrough"
          shortcut={formatShortcutLabel("strikethrough")}
          onClick={() => applyFormat("strikethrough")}
          disabled={disabled}
        >
          <Strikethrough className={toolbarIconClass} />
        </ToolbarButton>
      )}

      {shouldShowMarkdownToolbarDivider(0, hiddenItems) && <ToolbarDivider />}

      {isItemVisible("code") && (
        <ToolbarButton
          label="Inline code"
          itemId="code"
          shortcut={formatShortcutLabel("code")}
          onClick={() => applyFormat("code")}
          disabled={disabled}
        >
          <Code className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("codeBlock") && (
        <ToolbarButton
          label="Code block"
          itemId="codeBlock"
          shortcut={formatShortcutLabel("codeBlock")}
          onClick={() => applyFormat("codeBlock")}
          disabled={disabled}
        >
          <span className="font-mono text-[9px] leading-none">{"{ }"}</span>
        </ToolbarButton>
      )}
      {isItemVisible("link") && (
        <ToolbarButton
          label="Link"
          itemId="link"
          shortcut={formatShortcutLabel("link")}
          onClick={() => applyFormat("link")}
          disabled={disabled}
        >
          <Link className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("image") && (
        <ToolbarButton label="Image" itemId="image" onClick={() => applyFormat("image")} disabled={disabled}>
          <Image className={toolbarIconClass} />
        </ToolbarButton>
      )}

      {shouldShowMarkdownToolbarDivider(1, hiddenItems) && <ToolbarDivider />}

      {isItemVisible("list") && (
        <ToolbarButton
          label="Bullet list"
          itemId="list"
          shortcut={formatShortcutLabel("list")}
          onClick={() => applyFormat("list")}
          disabled={disabled}
        >
          <List className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("orderedList") && (
        <ToolbarButton
          label="Numbered list"
          itemId="orderedList"
          shortcut={formatShortcutLabel("orderedList")}
          onClick={() => applyFormat("orderedList")}
          disabled={disabled}
        >
          <ListOrdered className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("blockquote") && (
        <ToolbarButton
          label="Blockquote"
          itemId="blockquote"
          shortcut={formatShortcutLabel("blockquote")}
          onClick={() => applyFormat("blockquote")}
          disabled={disabled}
        >
          <Quote className={toolbarIconClass} />
        </ToolbarButton>
      )}
      {isItemVisible("horizontalRule") && (
        <ToolbarButton
          label="Horizontal rule"
          itemId="horizontalRule"
          onClick={() => applyFormat("horizontalRule")}
          disabled={disabled}
        >
          <Minus className={toolbarIconClass} />
        </ToolbarButton>
      )}
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
  const { containerRef, hiddenItems, isItemVisible } = useResponsiveMarkdownToolbar();

  return (
    <div
      ref={containerRef}
      style={toolbarLayoutStyle}
      className={cn(
        "relative flex w-full min-w-0 flex-nowrap items-center gap-[var(--toolbar-gap)] overflow-hidden",
        framed &&
          "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-0.5 py-px",
        className,
      )}
    >
      <div
        data-toolbar-probe
        aria-hidden
        className="pointer-events-none invisible absolute size-[var(--toolbar-btn)]"
      />
      <VariantNotesToolbarControls
        value={value}
        onChange={onChange}
        disabled={disabled}
        textareaRef={textareaRef}
        isItemVisible={isItemVisible}
        hiddenItems={hiddenItems}
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
