import { useRef, useState, type ReactNode, type RefObject } from "react";
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
  type TextEditResult,
} from "@/lib/markdownFormatting";

type MarkdownFormat =
  | "bold"
  | "italic"
  | "boldItalic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "link"
  | "image"
  | "list"
  | "orderedList"
  | "blockquote"
  | "horizontalRule"
  | "normalText"
  | `heading-${1 | 2 | 3 | 4 | 5 | 6}`;

interface VariantNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  toolbarRef?: RefObject<HTMLDivElement | null>;
  showToolbar?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px shrink-0 bg-[var(--color-border)]/80" aria-hidden />;
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
      className="h-7 w-7 shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
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
    case "boldItalic":
      return applyMarkdownWrap(value, selection, "***", "***", "text");
    case "strikethrough":
      return applyMarkdownWrap(value, selection, "~~", "~~", "strike");
    case "code":
      return applyMarkdownWrap(value, selection, "`", "`", "code");
    case "codeBlock":
      return applyMarkdownCodeBlock(value, selection);
    case "link":
      return applyMarkdownLink(value, selection);
    case "image":
      return applyMarkdownImage(value, selection);
    case "list":
      return applyMarkdownLinePrefix(value, selection, "- ");
    case "orderedList":
      return applyMarkdownOrderedList(value, selection);
    case "blockquote":
      return applyMarkdownLinePrefix(value, selection, "> ");
    case "horizontalRule":
      return applyMarkdownHorizontalRule(value, selection);
    case "normalText":
      return applyMarkdownNormalText(value, selection);
    case "heading-1":
      return applyMarkdownHeading(value, selection, 1);
    case "heading-2":
      return applyMarkdownHeading(value, selection, 2);
    case "heading-3":
      return applyMarkdownHeading(value, selection, 3);
    case "heading-4":
      return applyMarkdownHeading(value, selection, 4);
    case "heading-5":
      return applyMarkdownHeading(value, selection, 5);
    case "heading-6":
      return applyMarkdownHeading(value, selection, 6);
  }
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

    const result = applyFormatToNotes(format, textarea, value);
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
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
          className="h-7 w-7 shrink-0 justify-center gap-0 p-0 text-[var(--color-muted)]"
          aria-label="Text style"
          title="Text style"
        >
          <Heading className="h-3 w-3 shrink-0" />
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

      <ToolbarButton label="Bold" onClick={() => applyFormat("bold")} disabled={disabled}>
        <Bold className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => applyFormat("italic")} disabled={disabled}>
        <Italic className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label="Bold and italic"
        onClick={() => applyFormat("boldItalic")}
        disabled={disabled}
      >
        <span className="text-[10px] font-bold italic">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        onClick={() => applyFormat("strikethrough")}
        disabled={disabled}
      >
        <Strikethrough className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Inline code" onClick={() => applyFormat("code")} disabled={disabled}>
        <Code className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton label="Code block" onClick={() => applyFormat("codeBlock")} disabled={disabled}>
        <span className="font-mono text-[9px]">{"{ }"}</span>
      </ToolbarButton>
      <ToolbarButton label="Link" onClick={() => applyFormat("link")} disabled={disabled}>
        <Link className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={() => applyFormat("image")} disabled={disabled}>
        <Image className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Bullet list" onClick={() => applyFormat("list")} disabled={disabled}>
        <List className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        onClick={() => applyFormat("orderedList")}
        disabled={disabled}
      >
        <ListOrdered className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton label="Blockquote" onClick={() => applyFormat("blockquote")} disabled={disabled}>
        <Quote className="h-3 w-3" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => applyFormat("horizontalRule")}
        disabled={disabled}
      >
        <Minus className="h-3 w-3" />
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
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-0.5",
        framed &&
          "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-0.5",
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
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
