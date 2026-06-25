/** Enable with `?conditionalBonuses=true` on the planner URL. */
export function isConditionalBonusesEnabled(
  searchParams: URLSearchParams | string = window.location.search,
): boolean {
  const params =
    typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  return params.get("conditionalBonuses")?.toLowerCase() === "true";
}
