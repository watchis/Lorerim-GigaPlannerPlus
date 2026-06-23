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

const featureIcons = [Sparkles, Trees, Compass, GitBranch, Activity, Share2] as const;

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
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-7 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
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

      <section className="grid gap-4 pb-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--color-accent)]">
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
                      "flex w-full items-center justify-between gap-4 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-elevated)]/60",
                      index > 0 && "border-t border-[var(--color-border)]/50",
                      isActive && "bg-[var(--color-accent)]/5",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                        {entry.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {raceName ?? labels.panels["build-library"].noRace} · Level {level} ·{" "}
                        {entry.build.selectedPerkIds.length} perks
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {formatUpdatedAt(entry.updatedAt)}
                      </p>
                      <ArrowRight className="ml-auto mt-0.5 h-3.5 w-3.5 text-[var(--color-accent-muted)]" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit border-[var(--color-border)]/80">
          <CardHeader className="p-3 pb-1">
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
          <CardContent className="space-y-2 p-3 pt-1">
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
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 px-3 py-1.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/40"
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
    </div>
  );
}
