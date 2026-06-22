import { useEffect, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface NumericLevelInputProps {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  className?: string;
}

function clampLevel(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function NumericLevelInput({
  value,
  min,
  max,
  onCommit,
  className,
}: NumericLevelInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value, min, max]);

  const displayValue = draft ?? String(value);

  const commit = () => {
    if (draft === null) return;

    const trimmed = draft.trim();
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
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "w-14 border-0 bg-transparent px-1 py-1 text-center font-mono text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-0",
        className,
      )}
    />
  );
}
