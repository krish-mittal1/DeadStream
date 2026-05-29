"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useCallback, useRef } from "react";
import { Trash2 } from "lucide-react";

/**
 * Wraps a list item with a swipe-left gesture that reveals a dismiss action.
 *
 * - Swipe left past 100px (or fast flick) → animates the item off-screen and
 *   calls `onDismiss`
 * - Otherwise snaps back
 * - A red "dismiss" area with Trash2 icon is revealed behind the item as it
 *   slides left
 */
export function SwipeToDismissItem({
  children,
  onDismiss,
  dismissLabel = "Dismiss",
  className = "",
  disabled = false,
}) {
  const x = useMotionValue(0);
  const dismissedRef = useRef(false);

  const handleDragEnd = useCallback(
    (_, info) => {
      if (dismissedRef.current) return;

      if (info.offset.x < -100 || info.velocity.x < -500) {
        dismissedRef.current = true;
        animate(x, -320, {
          type: "spring",
          stiffness: 300,
          damping: 28,
          onComplete: () => onDismiss?.(),
        });
      } else {
        animate(x, 0, {
          type: "spring",
          stiffness: 400,
          damping: 35,
        });
      }
    },
    [onDismiss, x],
  );

  // Reveal opacity maps with drag distance
  const deleteOpacity = useMotionValue(0);

  const handleDrag = useCallback(
    (_, info) => {
      const progress = Math.min(Math.abs(info.offset.x) / 80, 1);
      deleteOpacity.set(progress);
    },
    [deleteOpacity],
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ─── Behind-the-item dismiss area ─── */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-6"
        style={{ opacity: deleteOpacity }}
      >
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-red)]/15 px-4 py-2 border border-[var(--color-red)]/20">
          <Trash2 size={14} className="text-[var(--color-red)]" />
          <span className="text-[11px] font-bold text-[var(--color-red)]">
            {dismissLabel}
          </span>
        </div>
      </motion.div>

      {/* ─── Draggable content ─── */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -280, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-1"
      >
        {children}
      </motion.div>
    </div>
  );
}
