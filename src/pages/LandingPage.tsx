import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Compass,
  GitBranch,
  Link2,
  Share2,
  Sparkles,
  Trees,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decodeBuild } from "@/engine/buildCodec";
import { cn } from "@/lib/utils";
import { useThemeConfig } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";
import type { SavedBuild } from "@/store/savedBuilds";
import { normalizeSavedBuild } from "@/store/savedBuilds";
import { BugReportButton } from "@/components/BugReportButton";

const featureIcons = [Sparkles, Trees, Compass, GitBranch, Activity, Share2] as const;

const GITHUB_URL = "https://github.com/watchis/Lorerim-GigaPlannerPlus";
const DISCORD_URL = "https://discord.gg/Tb5ETzBYjd";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LandingPage() {
  const navigate = useNavigate();
  const { labels } = useThemeConfig();
  const { landing } = labels;
  const buildLibraryLabels = labels.panels["build-library"];
  const gameData = useBuildStore((s) => s.gameData);
  const savedBuilds = useBuildStore((s) => s.savedBuilds);
  const activeBuildId = useBuildStore((s) => s.activeBuildId);
  const selectSavedBuildSlot = useBuildStore((s) => s.selectSavedBuildSlot);

  const [codeInput, setCodeInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const [recentBuildIds] = useState(() =>
    [...useBuildStore.getState().savedBuilds]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
      .map((entry) => entry.id),
  );

  const recentBuilds = useMemo(() => {
    const byId = new Map<string, SavedBuild>(
      savedBuilds.map((entry) => {
        const normalized = normalizeSavedBuild(entry);
        return [normalized.id, normalized];
      }),
    );
    return recentBuildIds
      .map((id) => byId.get(id))
      .filter((entry): entry is SavedBuild => entry !== undefined);
  }, [recentBuildIds, savedBuilds]);

  const handleImportCode = () => {
    const code = codeInput.trim();
    if (!code || !gameData) return;

    try {
      decodeBuild(code, gameData.game);
      navigate(`/planner?build=${encodeURIComponent(code)}`);
    } catch {
      setImportError(labels.errors.invalidBuildCode);
    }
  };

  const openBuild = (buildId: string) => {
    selectSavedBuildSlot(buildId);
    navigate("/planner");
  };

  return (
    <div className="page-scroll-with-fab mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-7 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <section>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-accent)]">
          {landing.howItWorksTitle}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {landing.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20 p-3"
            >
              <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/15 font-[family-name:var(--font-heading)] text-xs font-semibold text-[var(--color-accent)]">
                {index + 1}
              </span>
              <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold text-[var(--color-foreground)]">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-accent)]">
          {landing.featuresTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {landing.features.map((feature, index) => {
            const Icon = featureIcons[index] ?? Sparkles;
            return (
              <Card key={feature.title} className="border-[var(--color-border)]/80">
                <CardHeader className="gap-0 p-3 pb-1">
                  <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm text-[var(--color-foreground)]">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <CardDescription className="text-xs leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-accent)]">
              {landing.recentBuildsTitle}
            </h2>
            {savedBuilds.length > 0 && (
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-[var(--color-muted)]">
                <Link to="/builds">
                  {landing.recentBuildsViewAll}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {recentBuilds.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)]/70 px-4 py-6 text-center text-xs text-[var(--color-muted)]">
              {landing.recentBuildsEmpty}
            </p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20">
              {recentBuilds.map((entry, index) => {
                const raceName =
                  entry.build.raceId && entry.build.raceId !== "none"
                    ? gameData?.game.races.find((race) => race.id === entry.build.raceId)?.name
                    : null;
                const level =
                  entry.build.playerLevel ?? gameData?.game.mechanics.leveling.baseLevel ?? 1;
                const isActive = entry.id === activeBuildId;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => openBuild(entry.id)}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface-elevated)]/60 sm:items-center",
                      index > 0 && "border-t border-[var(--color-border)]/50",
                      isActive && "bg-[var(--color-accent)]/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                          {entry.name}
                        </p>
                        {isActive && (
                          <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
                            {buildLibraryLabels.activeBadge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {raceName ?? labels.panels["build-library"].noRace} · Level {level} ·{" "}
                        {entry.build.selectedPerkIds.length} perks
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-muted)] sm:hidden">
                        {formatUpdatedAt(entry.updatedAt)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {formatUpdatedAt(entry.updatedAt)}
                      </p>
                      <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 text-[var(--color-accent-muted)]" />
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-muted)] sm:hidden" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="min-w-0 overflow-hidden border-[var(--color-border)]/80">
          <CardHeader className="p-4 pb-2 sm:p-3 sm:pb-1">
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <Link2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm text-[var(--color-foreground)]">
                  {landing.importTitle}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-relaxed">
                  {landing.importDescription}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2 sm:p-3 sm:pt-1">
            <input
              type="text"
              value={codeInput}
              onChange={(event) => {
                setCodeInput(event.target.value);
                if (importError) setImportError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleImportCode();
              }}
              placeholder={landing.importPlaceholder}
              className="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-3 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/40 sm:py-1.5"
            />
            {importError && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {importError}
              </p>
            )}
            <Button
              size="sm"
              className="w-full"
              disabled={!codeInput.trim()}
              onClick={handleImportCode}
            >
              {landing.importButton}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-auto flex items-center justify-center gap-1 border-t border-[var(--color-border)]/50 pt-4">
        <Button asChild variant="ghost" size="icon" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <GithubIcon className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="ghost" size="icon" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" aria-label="Discord">
            <DiscordIcon className="h-4 w-4" />
          </a>
        </Button>
      </footer>
      <BugReportButton />
    </div>
  );
}
