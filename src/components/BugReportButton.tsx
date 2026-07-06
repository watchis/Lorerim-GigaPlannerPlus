import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const BUG_REPORT_URL = "https://github.com/watchis/Lorerim-GigaPlannerPlus/issues/new/choose";

export function BugReportButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 z-30 h-12 w-12 rounded-full border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-[var(--shadow-panel)] backdrop-blur-sm hover:bg-[var(--color-surface-elevated)] bottom-[max(1rem,env(safe-area-inset-bottom))]"
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
