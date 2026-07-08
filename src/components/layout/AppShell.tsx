import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Bug, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUG_REPORT_URL } from "@/lib/bugReport";
import { Button } from "@/components/ui/button";
import { useThemeConfig } from "@/theme/ThemeProvider";
import { useBuildStore } from "@/store/buildStore";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-[var(--radius-md)] px-3 py-2.5 text-sm transition-colors",
    isActive
      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
  );

export function AppShell() {
  const { labels } = useThemeConfig();
  const version = useBuildStore((s) => s.gameData?.game.manifest.version);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileNavRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMobileNavOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileNavOpen]);

  const navItems = [
    { to: "/", end: true, label: labels.nav.home },
    { to: "/planner", label: labels.nav.planner },
    { to: "/builds", label: labels.nav.builds },
  ] as const;

  return (
    <div className="app-shell flex h-dvh min-h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-40 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 pt-[max(0px,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
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
              <span className="hidden text-xs text-[var(--color-muted)] sm:block">
                {labels.app.subtitle}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 sm:gap-3 md:flex">
            {version && (
              <span className="hidden rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-muted)] lg:inline lg:text-xs">
                {labels.app.versionLabel}: {version}
              </span>
            )}
            {navItems.map(({ to, label, ...rest }) => (
              <NavLink key={to} to={to} className={navLinkClass} {...rest}>
                {label}
              </NavLink>
            ))}
          </nav>

          <Button
            ref={menuButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-[var(--color-muted)] md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileNavOpen && (
          <nav
            ref={mobileNavRef}
            id="mobile-nav"
            className="border-t border-[var(--color-border)]/70 bg-[var(--color-surface)]/95 px-4 py-3 md:hidden"
          >
            <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
              {version && (
                <span className="mb-1 px-3 text-[10px] text-[var(--color-muted)]">
                  {labels.app.versionLabel}: {version}
                </span>
              )}
              {navItems.map(({ to, label, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={navLinkClass}
                  onClick={() => setMobileNavOpen(false)}
                  {...rest}
                >
                  {label}
                </NavLink>
              ))}
              <div
                className="my-2 border-t border-[var(--color-border)]/70"
                role="separator"
                aria-hidden
              />
              <a
                href={BUG_REPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 text-sm transition-colors",
                  "text-[var(--color-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-foreground)]",
                )}
                onClick={() => setMobileNavOpen(false)}
              >
                <Bug className="h-4 w-4 shrink-0" aria-hidden />
                {labels.nav.reportBug}
              </a>
            </div>
          </nav>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
