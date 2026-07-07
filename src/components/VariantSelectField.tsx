import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const variantSelectTriggerClassName =
  "h-9 min-w-0 gap-2 overflow-hidden px-3 text-sm";

interface VariantSelectFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function VariantSelectField({ label, children, className }: VariantSelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-xs font-medium tracking-wide text-[var(--color-muted)]">{label}</span>
      {children}
    </div>
  );
}
