import { Component, type ErrorInfo, type ReactNode } from "react";

interface SoftRenderBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface SoftRenderBoundaryState {
  hasError: boolean;
}

/**
 * Isolates a single subtree so one corrupt card/widget cannot blank the page.
 */
export class SoftRenderBoundary extends Component<
  SoftRenderBoundaryProps,
  SoftRenderBoundaryState
> {
  state: SoftRenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SoftRenderBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Soft render boundary caught error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
