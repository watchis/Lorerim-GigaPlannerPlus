import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorScreen({ message, onRetry, retryLabel = "Try again" }: ErrorScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="max-w-md text-[var(--color-error)]">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button type="button" variant="default" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/">Return home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/planner">Open planner</Link>
        </Button>
      </div>
    </div>
  );
}
