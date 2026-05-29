"use client";

import { motion, useMotionValue, useTransform, useSpring, animate } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
import { RefreshCw, ArrowDown } from "lucide-react";

/**
 * Pull-to-refresh wrapper.
 *
 * Wraps content with a drag="y" gesture. When the user pulls down past a
 * threshold at the top of the page, it fires `onRefresh` and shows a
 * refreshing indicator. Auto-resets when done.
 *
 * - Only activates when the parent scroll container is at scrollTop === 0.
 * - Desktop: the wrapper is a no-op (drag is disabled).
 */
export function PullToRefresh({ children, onRefresh, disabled = false }) {
  // Spring-wrapped motion value for smooth, momentum-based drag
  const rawY = useMotionValue(0);
  const y = useSpring(rawY, { stiffness: 400, damping: 35, mass: 0.5 });

  const [state, setState] = useState("idle"); // idle | pulling | ready | refreshing
  const containerRef = useRef(null);
  const refreshingRef = useRef(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [hapticPulse, setHapticPulse] = useState(false);

  // ─── Track scroll position of the nearest scroll container ───
  useEffect(() => {
    const el = containerRef.current?.closest("[data-scroll-container]") || window;
    const handler = () => {
      const scrollY = el === window ? window.scrollY : el.scrollTop;
      setIsAtTop(scrollY <= 0);
    };
    handler();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // Pull progress: 0 → 1 between 0px and 80px of drag
  const pullProgress = useTransform(rawY, [0, 80], [0, 1]);
  const indicatorOpacity = useTransform(rawY, [0, 30], [0, 1]);
  const prevStateRef = useRef("idle");

  // ─── Haptic feedback: brief pulse when crossing into "ready" ───
  useEffect(() => {
    if (state === "ready" && prevStateRef.current !== "ready" && prevStateRef.current !== "refreshing") {
      setHapticPulse(true);
      setTimeout(() => setHapticPulse(false), 350);
    }
    if (state === "refreshing") {
      setHapticPulse(true);
      setTimeout(() => setHapticPulse(false), 200);
    }
    prevStateRef.current = state;
  }, [state]);

  const handleDrag = useCallback((_, info) => {
    if (refreshingRef.current) return;
    // Safety: if scroll position changed between render and drag, abort
    const el = containerRef.current?.closest("[data-scroll-container]") || window;
    const scrollY = el === window ? window.scrollY : el.scrollTop;
    if (scrollY > 5 && info.offset.y > 0) {
      // Not at top — snap back immediately
      rawY.set(0);
      setState("idle");
      return;
    }
    if (info.offset.y > 10) setState("pulling");
    if (info.offset.y > 80) setState("ready");
  }, [rawY]);

  const handleDragEnd = useCallback(
    (_, info) => {
      if (refreshingRef.current) return;

      if (info.offset.y > 80 || info.velocity.y > 300) {
        refreshingRef.current = true;
        setState("refreshing");

        // Lock the indicator at a fixed pull-down position
        animate(rawY, 56, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });

        // Fire the refresh
        Promise.resolve(onRefresh?.()).then(() => {
          // Give a minimum display time so the spinner is seen
          setTimeout(() => {
            animate(rawY, 0, {
              type: "spring",
              stiffness: 350,
              damping: 30,
              onComplete: () => {
                setState("idle");
                refreshingRef.current = false;
              },
            });
          }, 800);
        });
      } else {
        setState("idle");
        // Spring back with velocity-informed damping for a natural feel
        const damping = info.velocity.y > 100 ? 22 : 30;
        animate(rawY, 0, {
          type: "spring",
          stiffness: 280,
          damping,
          velocity: info.velocity.y,
        });
      }
    },
    [onRefresh, rawY],
  );

  const canDrag = !disabled && isAtTop;

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* ─── Pull indicator ─── */}
      <motion.div
        className="absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          height: 60,
          y: useTransform(y, [0, 56], [-60, 0]),
          opacity: indicatorOpacity,
        }}
      >
        <motion.div
          className={`flex items-center justify-center gap-2 rounded-full bg-[var(--color-panel)] border border-[var(--color-line)] px-4 py-2 shadow-lg transition-shadow duration-200 ${
            hapticPulse ? "shadow-[0_0_20px_rgba(255,69,0,0.25)]" : ""
          }`}
          style={{
            scale: pullProgress,
          }}
        >
          {state === "refreshing" ? (
            <RefreshCw size={14} className={`animate-spin text-[var(--color-accent)] ${hapticPulse ? "vote-animate" : ""}`} />
          ) : (
            <motion.div
              animate={{ rotate: state === "ready" ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ArrowDown size={14} className={`text-[var(--color-accent)] ${hapticPulse ? "vote-animate" : ""}`} />
            </motion.div>
          )}
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
            {state === "ready"
              ? "Release to refresh"
              : state === "refreshing"
                ? "Refreshing..."
                : "Pull to refresh"}
          </span>
        </motion.div>
      </motion.div>

      {/* ─── Draggable content ─── */}
      <motion.div
        drag={canDrag ? "y" : false}
        dragConstraints={{ top: 0, bottom: 200 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        dragTransition={{ power: 0.08, timeConstant: 300, modifyTarget: (v) => Math.max(0, v) }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: rawY }}
        className="relative z-1"
      >
        {children}
      </motion.div>
    </div>
  );
}
