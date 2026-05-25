"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-[var(--hot)]/30 bg-[var(--panel)] p-8 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--hot)]/10">
            <AlertTriangle size={24} className="text-[var(--hot)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Something went wrong</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="button-pop flex items-center gap-2 rounded border border-[var(--line)] px-4 py-2 text-xs text-[var(--text)] hover:bg-[var(--panel-2)]"
            aria-label="Try again"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
