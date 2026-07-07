const COARSE_POINTER_QUERY = "(pointer: coarse)";

/** Anchor the current URL so the first back/forward swipe does not leave the app. */
function anchorHistory(): void {
  window.history.pushState({ swipeGuard: true }, "", window.location.href);
}

/**
 * Reduce accidental mobile browser back/forward navigation from edge swipes.
 * Intentional in-app history (e.g. React Router) still works; the guard only adds
 * a buffer entry for the current URL on touch devices.
 */
export function installPreventBrowserSwipeNavigation(): () => void {
  if (typeof window === "undefined" || !window.history?.pushState) {
    return () => {};
  }

  if (!window.matchMedia(COARSE_POINTER_QUERY).matches) {
    return () => {};
  }

  anchorHistory();

  const onPopState = () => {
    anchorHistory();
  };

  window.addEventListener("popstate", onPopState);

  return () => {
    window.removeEventListener("popstate", onPopState);
  };
}
