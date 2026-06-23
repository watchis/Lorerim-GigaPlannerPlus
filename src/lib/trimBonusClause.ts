function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

const LEADING_FILLER =
  /^(?:however|but|also|additionally|otherwise|and|yet|still)\s*[,:]?\s*/i;

export function trimBonusClauses(clause: string): string[] {
  const normalized = clause.trim();
  if (!normalized) return [];

  const parts = normalized.split(/\s*,\s*(?:however|but)\s+/i);

  return parts
    .map((part) => {
      const withoutPeriod = part.trim().replace(LEADING_FILLER, "").trim().replace(/\.$/, "");
      return ensurePeriod(capitalizeSentence(withoutPeriod));
    })
    .filter(Boolean);
}
