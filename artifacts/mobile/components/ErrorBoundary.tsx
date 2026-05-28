import React, { Component, ComponentType, PropsWithChildren } from "react";

import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Diagnostic: production stacks are minified to one-letter names which
    // makes the persistent "Failed to set an indexed property [0] on
    // CSSStyleDeclaration" home-tab crash impossible to triage from logs
    // alone. componentStack from React is NOT minified — it lists the
    // actual component display names (e.g. HomeScreen > View > LinearGradient)
    // so we can pinpoint exactly which subtree threw. Log with a clear
    // [CRASH-TRAP] prefix so the user can copy-paste the offending lines.
    // eslint-disable-next-line no-console
    console.error(
      "[CRASH-TRAP] ErrorBoundary caught render error:",
      error?.message ?? String(error),
      "\nComponent stack:",
      info?.componentStack ?? "(none)",
      "\nError stack (first 8 frames):",
      error?.stack?.split("\n").slice(0, 8).join("\n") ?? "(none)",
    );
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
