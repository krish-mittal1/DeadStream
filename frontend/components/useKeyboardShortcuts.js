"use client";

import { useEffect, useCallback } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function useKeyboardShortcuts(posts = []) {
  const user = useSimulationStore((s) => s.user);
  const like = useSimulationStore((s) => s.like);

  const handleKeyDown = useCallback(
    (e) => {
      // Only trigger if no input/textarea is focused
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // j/k: navigate posts
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const direction = e.key === "j" ? 1 : -1;
        const currentIndex = posts.findIndex((p) => {
          const el = document.getElementById(`post-${p.id}`);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight * 0.5;
        });
        const nextIndex = Math.max(0, Math.min(posts.length - 1, currentIndex + direction));
        const target = document.getElementById(`post-${posts[nextIndex]?.id}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          // Focus the post
          target.focus({ preventScroll: true });
          target.classList.add("ring-1", "ring-[var(--color-accent)]/30");
          setTimeout(() => target.classList.remove("ring-1", "ring-[var(--color-accent)]/30"), 1500);
        }
      }

      // l: like the focused/visible post
      if (e.key === "l" && user) {
        const visible = posts.find((p) => {
          const el = document.getElementById(`post-${p.id}`);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight * 0.5;
        });
        if (visible) like(visible.id).catch(() => {});
      }

      // c: open comments/replies
      if (e.key === "c") {
        const visible = posts.find((p) => {
          const el = document.getElementById(`post-${p.id}`);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight * 0.5;
        });
        if (visible) {
          window.open(`/post/${visible.id}`, "_self");
        }
      }
    },
    [posts, user, like]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
