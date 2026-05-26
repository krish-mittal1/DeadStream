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
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-8">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-[var(--color-red)]/20 bg-[var(--color-panel)] p-10 text-center shadow-lg max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-red)]/10">
              <AlertTriangle size={32} className="text-[var(--color-red)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text)]">
                Something went wrong
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-2)] px-6 py-2.5 text-sm font-medium text-[var(--color-text)] transition-all duration-200 hover:bg-[var(--color-panel-hover)] hover:border-[var(--color-line-light)] active:scale-[0.97]"
              aria-label="Try again"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
