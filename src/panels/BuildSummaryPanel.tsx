import { useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { encodeBuild, decodeBuild, setBuildInUrl } from "@/engine/buildCodec";
import { usePanelLabels, useThemeConfig } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

interface BuildSummaryPanelProps {
  embedded?: boolean;
}

export function BuildSummaryPanel({ embedded = false }: BuildSummaryPanelProps) {
  const { labels: allLabels } = useThemeConfig();
  const labels = usePanelLabels("build-summary");
  const gameData = useBuildStore((s) => s.gameData);
  const build = useBuildStore((s) => s.build);
  const setDescription = useBuildStore((s) => s.setDescription);
  const loadBuild = useBuildStore((s) => s.loadBuild);
  const resetBuild = useBuildStore((s) => s.resetBuild);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!gameData) return null;

  const buildCode = encodeBuild(build, gameData.game);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCode);
      setBuildInUrl(buildCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleLoad = () => {
    try {
      const decoded = decodeBuild(codeInput.trim(), gameData.game);
      loadBuild(decoded);
      setBuildInUrl(codeInput.trim());
      setError(null);
    } catch {
      setError(allLabels.errors.invalidBuildCode);
    }
  };

  const content = (
    <>
      <CardHeader className={embedded ? "pb-3" : undefined}>
        <CardTitle className={embedded ? "text-base" : undefined}>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted)]">{labels.buildCode}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="group flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-left transition-colors hover:border-[var(--color-accent-muted)]"
          >
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-[var(--color-accent)]">
              {buildCode}
            </code>
            <Copy className="h-4 w-4 shrink-0 text-[var(--color-muted)] group-hover:text-[var(--color-accent)]" />
          </button>
          <p className="text-xs text-[var(--color-muted)]">
            {copied ? labels.copied : labels.copyCode}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]" htmlFor="build-desc">
            {labels.description}
          </label>
          <textarea
            id="build-desc"
            value={build.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={labels.descriptionPlaceholder}
            className="min-h-[80px] w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-muted)]" htmlFor="build-code-input">
            {labels.loadFromCode}
          </label>
          <div className="flex gap-2">
            <input
              id="build-code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 font-mono text-xs text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <Button variant="outline" onClick={handleLoad}>
              Load
            </Button>
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        </div>

        <Button variant="destructive" className="w-full" onClick={resetBuild}>
          <RotateCcw className="h-4 w-4" />
          {labels.resetBuild}
        </Button>
      </CardContent>
    </>
  );

  if (embedded) {
    return <div className="flex-shrink-0">{content}</div>;
  }

  return <Card className="flex-shrink-0">{content}</Card>;
}
