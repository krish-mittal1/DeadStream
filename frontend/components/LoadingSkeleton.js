"use client";

import { motion } from "framer-motion";

export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading feed" className="divide-y divide-[var(--color-line)]">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex gap-3 bg-[var(--color-bg-secondary)] px-4 py-5 md:px-6"
        >
          {/* Vote skeleton */}
          <div className="flex flex-col items-center gap-1.5 w-10 shrink-0 pt-0.5">
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
              className="h-6 w-6 rounded-lg shimmer"
            />
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.2 }}
              className="h-4 w-6 rounded shimmer"
            />
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.4 }}
              className="h-6 w-6 rounded-lg shimmer"
            />
          </div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Author row */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                className="h-6 w-6 rounded-full shimmer shrink-0"
              />
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.15 }}
                className="h-3 w-20 rounded shimmer"
              />
              <motion.div
                animate={{ opacity: [0.25, 0.6, 0.25] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 + 0.3 }}
                className="h-2.5 w-10 rounded shimmer"
              />
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
            <div className="flex gap-4 pt-1">
              {[1, 2, 3].map((j) => (
                <motion.div
                  key={j}
                  animate={{ opacity: [0.2, 0.55, 0.2] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1 + j * 0.15,
                  }}
                  className="h-3 w-12 rounded shimmer"
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
