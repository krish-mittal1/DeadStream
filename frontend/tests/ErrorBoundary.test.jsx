import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

// A component that throws on demand
function Buggy({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error("💥 something broke");
  }
  return <div>All good here</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders fallback UI when a child throws", () => {
    // Suppress console.error from React's error logging in test output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Buggy shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("💥 something broke")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();

    spy.mockRestore();
  });

  it("re-renders children after clicking 'Try again'", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Render with error
    const { rerender } = render(
      <ErrorBoundary>
        <Buggy shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();

    // Click "Try again" to reset error state
    screen.getByText("Try again").click();

    // After reset, re-render without error
    rerender(
      <ErrorBoundary>
        <div>Recovered successfully</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Recovered successfully")).toBeDefined();

    spy.mockRestore();
  });

  it("shows default message when error has no message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    function NoMessageError() {
      throw new Error();
    }

    render(
      <ErrorBoundary>
        <NoMessageError />
      </ErrorBoundary>
    );

    expect(screen.getByText("An unexpected error occurred")).toBeDefined();

    spy.mockRestore();
  });
});
