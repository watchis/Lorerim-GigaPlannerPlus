import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";

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
  const stackedLayout = usePlannerStackedLayout();
  const nav = !stackedLayout ? (back ?? forward) : undefined;

  return (
    <CardHeader
      className={cn(
        "flex-shrink-0 space-y-0 border-b border-[var(--color-border)]/50 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {titleRow ?? (title && <CardTitle className="text-base">{title}</CardTitle>)}
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {nav && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 px-2 md:-mr-2"
            onClick={nav.onClick}
            aria-label={nav.label}
          >
            {back && <ChevronLeft className="h-4 w-4 shrink-0" />}
            <span className="hidden sm:inline">{nav.label}</span>
            {forward && <ChevronRight className="h-4 w-4 shrink-0" />}
          </Button>
        )}
      </div>
    </CardHeader>
  );
}
