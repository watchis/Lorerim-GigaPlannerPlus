import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkspacePanelHeaderProps {
  title?: ReactNode;
  titleRow?: ReactNode;
  subtitle?: ReactNode;
  back?: {
    label: string;
    onClick: () => void;
  };
  forward?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function WorkspacePanelHeader({
  title,
  titleRow,
  subtitle,
  back,
  forward,
  className,
}: WorkspacePanelHeaderProps) {
  const nav = back ?? forward;

  return (
    <CardHeader
      className={cn(
        "flex-shrink-0 space-y-0 border-b border-[var(--color-border)]/50 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {titleRow ?? (title && <CardTitle className="text-base">{title}</CardTitle>)}
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {nav && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 -mr-2"
            onClick={nav.onClick}
          >
            {back && <ChevronLeft className="h-4 w-4" />}
            {nav.label}
            {forward && <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </CardHeader>
  );
}
