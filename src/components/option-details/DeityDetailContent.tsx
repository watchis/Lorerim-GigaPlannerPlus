import type { Deity, Race } from "@/data/schemas";

function isAllRaces(value: string, races: Race[]): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "all") return true;

  const allRaceNames = new Set(races.map((race) => race.name.toLowerCase()));
  const listedNames = value
    .split("/")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  if (listedNames.length === 0 || listedNames.length !== allRaceNames.size) return false;

  return listedNames.every((name) => allRaceNames.has(name));
}

function formatRaceField(value: string | undefined, races: Race[]): string {
  if (!value || value === "-") return "";
  if (isAllRaces(value, races)) return "All";
  return value;
}

function formatStartingRaces(value: string | undefined, races: Race[]): string {
  const formatted = formatRaceField(value, races);
  return formatted || "None";
}

interface DeityDetailContentProps {
  deity: Deity;
  races: Race[];
  labels: {
    races: string;
    shrine: string;
    follower: string;
    devotee: string;
    startingRaces: string;
    shrineLocations: string;
    tenets: string;
  };
  hideHeader?: boolean;
}

export function DeityDetailContent({ deity, races, labels, hideHeader }: DeityDetailContentProps) {
  if (deity.id === "none") return null;

  const compatibleRaces = formatRaceField(deity.race, races);
  const startingRaces = formatStartingRaces(deity.starting, races);
  const shrineLocationText =
    deity.shrineLocations.length > 0 ? deity.shrineLocations.join("\n") : "";
  const tenetsText = deity.tenets?.trim();
  const hasTenets = Boolean(tenetsText && tenetsText !== "-");

  const rows = [
    { label: labels.races, value: compatibleRaces },
    { label: labels.startingRaces, value: startingRaces },
    ...(hasTenets ? [{ label: labels.tenets, value: tenetsText }] : []),
    { label: labels.shrine, value: deity.shrine },
    { label: labels.follower, value: deity.follower },
    { label: labels.devotee, value: deity.devotee },
    { label: labels.shrineLocations, value: shrineLocationText },
  ].filter((row) => row.value && row.value !== "-");

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <h3 className="font-[family-name:var(--font-heading)] text-base font-semibold text-[var(--color-accent)]">
          {deity.name}
        </h3>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/35 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-muted)]">
              {row.label}
            </p>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[var(--color-foreground)]">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
