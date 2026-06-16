"use client";

import { motion } from "framer-motion";

export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading feed" className="px-4 py-4 space-y-0 md:px-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 mb-2"
        >
          {/* Content skeleton */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Author row */}
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                className="h-8 w-8 rounded-full shimmer shrink-0 mt-0.5"
              />
              <div className="space-y-1.5 flex-1">
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.15 }}
                  className="h-3 w-24 rounded shimmer"
                />
                <motion.div
                  animate={{ opacity: [0.25, 0.6, 0.25] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.3 }}
                  className="h-2.5 w-32 rounded shimmer"
                />
              </div>
            </div>
            {/* Title */}
            <div className="space-y-1.5">
              <motion.div
                animate={{ opacity: [0.3, 0.75, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.2 }}
                className="h-5 w-3/4 rounded-lg shimmer"
              />
              <motion.div
                animate={{ opacity: [0.25, 0.65, 0.25] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.35 }}
                className="h-5 w-1/2 rounded-lg shimmer"
              />
            </div>
            {/* Body excerpt */}
            <div className="space-y-1.5">
              <motion.div
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.3 }}
                className="h-3 w-full rounded shimmer"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.4 }}
                className="h-3 w-full rounded shimmer"
              />
              <motion.div
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.5 }}
                className="h-3 w-2/3 rounded shimmer"
              />
            </div>
            {/* Action bar */}
            <div className="flex gap-2 pt-2 border-t border-[var(--color-line)]/50">
              {[28, 20, 20, 20].map((w, j) => (
                <motion.div
                  key={j}
                  animate={{ opacity: [0.2, 0.55, 0.2] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1 + j * 0.12,
                  }}
                  className={`h-5 rounded-lg shimmer`}
                  style={{ width: `${w * 2}px` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex items-center justify-center py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="relative h-10 w-10"
        >
          <div className="absolute inset-0 rounded-full border-2 border-[var(--color-line)]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-accent)]" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-b-[var(--color-gold)]"
            animate={{ rotate: -180 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-xs text-[var(--color-text-muted)] font-medium"
        >
          Loading...
        </motion.p>
      </motion.div>
    </div>
  );
}

export function CardSkeleton({ count = 1 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 rounded shimmer" />
              <div className="h-2.5 w-20 rounded shimmer" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-4 w-5/6 rounded shimmer" />
            <div className="h-4 w-2/3 rounded shimmer" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
