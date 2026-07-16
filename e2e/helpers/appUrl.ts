/**
 * Convert an app-absolute path to a Playwright URL that respects `baseURL`
 * (including the `/Lorerim-GigaPlannerPlus/` path prefix).
 *
 * Leading `/` is resolved against the host origin and would skip the Vite base.
 */
export function appUrl(path = "/"): string {
  if (!path || path === "/") return "./";
  if (path.startsWith("/?")) return `./${path.slice(1)}`;
  if (path.startsWith("/")) return `.${path}`;
  return path;
}
