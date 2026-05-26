"use client";

import { motion } from "framer-motion";

export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading feed">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
          className="flex gap-3 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] px-4 py-4 md:px-6"
        >
          {/* Vote skeleton */}
          <div className="flex flex-col items-center gap-1.5 w-10 shrink-0 pt-0.5">
            <div className="h-6 w-6 rounded-lg shimmer" />
            <div className="h-4 w-6 rounded shimmer" />
            <div className="h-6 w-6 rounded-lg shimmer" />
          </div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Author row - compact */}
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full shimmer" />
              <div className="h-3 w-24 rounded shimmer" />
              <div className="h-2.5 w-12 rounded shimmer" />
            </div>
            {/* Title skeleton */}
            <div className="space-y-1.5">
              <div className="h-5 w-3/4 rounded shimmer" />
              <div className="h-5 w-1/2 rounded shimmer" />
            </div>
            {/* Body excerpt skeleton */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-full rounded shimmer" />
              <div className="h-3 w-2/3 rounded shimmer" />
            </div>
            {/* Action bar */}
            <div className="flex gap-4">
              <div className="h-3 w-14 rounded shimmer" />
              <div className="h-3 w-14 rounded shimmer" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
