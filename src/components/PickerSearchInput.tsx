import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PickerSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: PickerSearchInputProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]/60 pl-8 pr-2 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/40 max-md:h-10 max-md:text-sm"
      />
    </div>
  );
}

export function matchesPickerSearch(
  query: string,
  fields: Array<string | undefined>,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(normalized);
}
