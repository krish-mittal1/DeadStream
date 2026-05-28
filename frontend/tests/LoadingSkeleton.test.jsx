import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedSkeleton, PageSkeleton, CardSkeleton } from "../components/LoadingSkeleton";

describe("FeedSkeleton", () => {
  it("renders with status role", () => {
    const { container } = render(<FeedSkeleton />);
    const statusEls = container.querySelectorAll('[role="status"]');
    expect(statusEls.length).toBe(1);
  });

  it("renders shimmer elements", () => {
    const { container } = render(<FeedSkeleton />);
    const shimmers = container.querySelectorAll(".shimmer");
    expect(shimmers.length).toBeGreaterThan(10);
  });
});

describe("PageSkeleton", () => {
  it("renders loading spinner and text", () => {
    render(<PageSkeleton />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});

describe("CardSkeleton", () => {
  it("renders specified number of cards", () => {
    const { container } = render(<CardSkeleton count={3} />);
    const shimmers = container.querySelectorAll(".shimmer");
    expect(shimmers.length).toBeGreaterThan(10);
  });

  it("renders single card by default", () => {
    const { container } = render(<CardSkeleton />);
    const shimmers = container.querySelectorAll(".shimmer");
    expect(shimmers.length).toBeGreaterThan(3);
  });

  it("renders zero cards gracefully", () => {
    const { container } = render(<CardSkeleton count={0} />);
    const shimmers = container.querySelectorAll(".shimmer");
    expect(shimmers.length).toBe(0);
  });
});
