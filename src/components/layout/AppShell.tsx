import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useThemeConfig } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

interface AppShellProps {
  variant?: "default" | "minimal";
}

export function AppShell({ variant = "default" }: AppShellProps) {
  const { labels } = useThemeConfig();
  const version = useBuildStore((s) => s.gameData?.game.manifest.version);

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-visible">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                className="h-10 w-10 text-[var(--color-accent)] drop-shadow-[0_0_4px_rgba(201,162,39,0.15)]"
                aria-hidden
              >
                <path
                  d="M8 22 L16 8 L24 22 Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="16" cy="18" r="3" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-[family-name:var(--font-heading)] text-base font-semibold tracking-wide text-[var(--color-accent)] sm:text-lg">
                {labels.app.title}
              </span>
              {variant === "default" && (
                <span className="hidden text-xs text-[var(--color-muted)] sm:block">
                  {labels.app.subtitle}
                </span>
              )}
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            {version && (
              <span className="hidden rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-muted)] sm:inline sm:text-xs">
                {labels.app.versionLabel}: {version}
              </span>
            )}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
                )
              }
            >
              {labels.nav.home}
            </NavLink>
            <NavLink
              to="/planner"
              className={({ isActive }) =>
                cn(
                  "rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
                )
              }
            >
              {labels.nav.planner}
            </NavLink>
            <NavLink
              to="/builds"
              className={({ isActive }) =>
                cn(
                  "rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
                )
              }
            >
              {labels.nav.builds}
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
