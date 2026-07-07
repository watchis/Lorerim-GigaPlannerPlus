// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { installPreventBrowserSwipeNavigation } from "@/lib/preventBrowserSwipeNavigation";

describe("installPreventBrowserSwipeNavigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anchors history on coarse-pointer devices", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList);
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");

    const cleanup = installPreventBrowserSwipeNavigation();

    expect(pushState).toHaveBeenCalledWith({ swipeGuard: true }, "", window.location.href);
    expect(addListener).toHaveBeenCalledWith("popstate", expect.any(Function));

    cleanup();
    expect(removeListener).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("is a no-op on fine-pointer devices", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const addListener = vi.spyOn(window, "addEventListener");

    const cleanup = installPreventBrowserSwipeNavigation();

    expect(pushState).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();
    cleanup();
  });

  it("re-anchors history when popstate fires", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList);
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const addListener = vi.spyOn(window, "addEventListener");

    installPreventBrowserSwipeNavigation();
    const handler = vi.mocked(addListener).mock.calls.find(
      ([event]) => event === "popstate",
    )?.[1] as EventListener;

    pushState.mockClear();
    handler(new PopStateEvent("popstate"));

    expect(pushState).toHaveBeenCalledWith({ swipeGuard: true }, "", window.location.href);
  });
});
