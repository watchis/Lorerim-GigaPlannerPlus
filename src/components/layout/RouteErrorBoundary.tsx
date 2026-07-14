import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";

interface RouteErrorBoundaryProps {
  children: ReactNode;
  /** Change this (e.g. pathname) to clear a caught error after navigation. */
  resetKey: string;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors in routed pages so a single broken page cannot blank
 * the entire SPA until a hard refresh.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Route render error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorScreen
          message={`Something went wrong on this page: ${this.state.error.message}`}
        />
      );
    }
    return this.props.children;
  }
}
