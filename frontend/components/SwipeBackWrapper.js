"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useCallback, useRef } from "react";

/**
 * Wraps content with a horizontal swipe gesture that triggers navigation back.
 *
 * - Drag right → reveals a subtle edge glow + background peek
 * - Drag past threshold (80px or rapid flick) → calls onSwipeBack
 * - Otherwise snaps back to neutral
 * - Uses `dragDirectionLock`-like behavior by only allowing "x" axis drag
 */
export function SwipeBackWrapper({
  children,
  onSwipeBack,
  disabled = false,
  className = "",
}) {
  const x = useMotionValue(0);
  const swipingRef = useRef(false);

  // Edge-peek glow fades in as user drags right
  const edgeGlow = useTransform(x, [0, 80], [0, 1]);
  const bgReveal = useTransform(x, [0, 60], [0, 1]);

  const handleDragEnd = useCallback(
    (event, info) => {
      // Ignore if already navigating back
      if (swipingRef.current) return;

      const threshold = 80;
      const velocityThreshold = 400;

      if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        swipingRef.current = true;
        // Animate the page sliding out before navigating
        animate(x, 220, {
          type: "spring",
          stiffness: 400,
          damping: 35,
          onComplete: () => onSwipeBack?.(),
        });
      } else {
        // Snap back to origin
        animate(x, 0, {
          type: "spring",
          stiffness: 400,
          damping: 35,
        });
      }
    },
    [onSwipeBack, x],
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ─── Previous-page peek layer ─── */}
      <motion.div
        className="absolute inset-y-0 right-[40%] left-0 pointer-events-none z-0"
        style={{ opacity: bgReveal }}
      >
        <div className="h-full w-full bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg)]" />
      </motion.div>

      {/* ─── Edge glow indicator ─── */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none z-10"
        style={{
          opacity: edgeGlow,
          background:
            "linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-hover) 50%, var(--color-accent) 100%)",
          boxShadow: "0 0 12px rgba(255,69,0,0.3)",
        }}
      />

      {/* ─── Draggable content ─── */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 160 }}
        dragElastic={{ left: 0, right: 0.15 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-1 sm:cursor-auto cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* ─── "Pull to go back" hint (appears on first drag) ─── */}
      <motion.div
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-20"
        style={{ opacity: useTransform(x, [20, 70], [0, 1]) }}
      >
        <div className="flex items-center gap-2 rounded-full bg-[var(--color-panel)] border border-[var(--color-line)] px-3 py-1.5 shadow-lg">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
            Back
          </span>
        </div>
      </motion.div>
    </div>
  );
}
