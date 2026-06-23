import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  message: string;
}

export function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="max-w-md text-[var(--color-error)]">{message}</p>
      <Button asChild variant="outline">
        <Link to="/">Return home</Link>
      </Button>
    </div>
  );
}
