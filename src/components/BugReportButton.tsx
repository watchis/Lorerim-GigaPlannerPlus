import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlannerStackedLayout } from "@/layout/plannerLayout";
import { cn } from "@/lib/utils";

const BUG_REPORT_URL = "https://github.com/watchis/Lorerim-GigaPlannerPlus/issues/new/choose";

export function BugReportButton() {
  const stackedPlanner = usePlannerStackedLayout();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "fixed z-30 h-11 w-11 rounded-full border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[var(--shadow-panel)] backdrop-blur-sm hover:bg-[var(--color-surface-elevated)] right-[max(1rem,env(safe-area-inset-right))] md:h-12 md:w-12",
            stackedPlanner
              ? "bottom-[max(4.75rem,calc(3.75rem+env(safe-area-inset-bottom)))]"
              : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
          )}
          asChild
        >
          <a
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Found a bug? Report it here."
          >
            <Bug className="h-6 w-6" aria-hidden />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Found a bug? Report it here.</TooltipContent>
    </Tooltip>
  );
}
