"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type FallbackRender = (args: { error: Error | null; reset: () => void }) => ReactNode;

export interface InteractionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | FallbackRender;
  resetKeys?: unknown[];
  onReset?: () => void;
  onError?: (error: Error, info: ErrorInfo) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

interface InteractionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function arraysAreDifferent(a?: unknown[], b?: unknown[]) {
  if (!a && !b) {
    return false;
  }
  if (!a || !b) {
    return true;
  }
  if (a.length !== b.length) {
    return true;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (!Object.is(a[index], b[index])) {
      return true;
    }
  }
  return false;
}

interface DefaultFallbackProps {
  error: Error | null;
  reset: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

function DefaultFallback({ error, reset, title, description, actionLabel }: DefaultFallbackProps) {
  return (
    <div
      role="alert"
      style={{
        borderRadius: "1rem",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        padding: "1.5rem",
        display: "grid",
        gap: "0.75rem",
        backgroundColor: "var(--surface, #ffffff)",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
      }}
    >
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
          {title ?? "Something went wrong"}
        </h2>
        <p style={{ margin: 0, color: "rgba(15, 23, 42, 0.7)" }}>
          {description ?? "Please try again. If the problem continues, contact support."}
        </p>
      </div>
      {error?.message ? (
        <pre
          style={{
            margin: 0,
            padding: "0.75rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(15, 23, 42, 0.05)",
            color: "rgba(15, 23, 42, 0.8)",
            fontSize: "0.875rem",
            overflowX: "auto",
          }}
        >
          {error.message}
        </pre>
      ) : null}
      <div>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            fontWeight: 600,
            color: "#ffffff",
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            cursor: "pointer",
          }}
        >
          {actionLabel ?? "Try again"}
        </button>
      </div>
    </div>
  );
}

export class InteractionErrorBoundary
  extends Component<InteractionErrorBoundaryProps, InteractionErrorBoundaryState>
{
  state: InteractionErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): InteractionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info);
    } else if (process.env.NODE_ENV !== "production") {
      console.error("InteractionErrorBoundary captured an error", error, info);
    }
  }

  componentDidUpdate(prevProps: InteractionErrorBoundaryProps): void {
    if (this.state.hasError && arraysAreDifferent(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  private resetErrorBoundary() {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback, title, description, actionLabel } = this.props;
      const error = this.state.error;
      const reset = () => this.resetErrorBoundary();

      if (typeof fallback === "function") {
        return (fallback as FallbackRender)({ error, reset });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultFallback
          error={error}
          reset={reset}
          title={title}
          description={description}
          actionLabel={actionLabel}
        />
      );
    }

    return this.props.children;
  }
}
