import { useEffect, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface NumericLevelInputProps {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  size?: "default" | "compact" | "touch";
  className?: string;
  "aria-label"?: string;
}

function clampLevel(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function NumericLevelInput({
  value,
  min,
  max,
  onCommit,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: NumericLevelInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value, min, max]);

  const displayValue = draft ?? String(value);

  const commit = () => {
    const trimmed = (draft ?? String(value)).trim();
    if (trimmed === "") {
      setDraft(null);
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setDraft(null);
      return;
    }

    onCommit(clampLevel(parsed, min, max));
    setDraft(null);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value.replace(/\D/g, ""));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={displayValue}
      aria-label={ariaLabel}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }
      }}
      style={
        size === "compact"
          ? { fontSize: 12, lineHeight: 1, fontFamily: "ui-monospace, monospace" }
          : size === "touch"
            ? { fontSize: 14, lineHeight: 1, fontFamily: "ui-monospace, monospace" }
            : undefined
      }
      className={cn(
        "border-0 bg-transparent text-center tabular-nums text-[var(--color-foreground)] focus:outline-none focus:ring-0",
        size === "compact"
          ? "h-5 w-7 min-w-0 px-0 py-0"
          : size === "touch"
            ? "h-9 w-10 min-w-0 px-0 py-0"
            : "w-14 px-1 py-1 font-mono text-sm",
        className,
      )}
    />
  );
}
