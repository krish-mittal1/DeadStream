"use client";

import { motion } from "framer-motion";

function Shimmer({ className = "" }) {
  return (
    <div
      className={`rounded bg-[var(--panel-2)] ${className}`}
      style={{
        background: `linear-gradient(90deg, var(--panel-2) 25%, rgba(143,209,79,0.06) 50%, var(--panel-2) 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s ease-in-out infinite",
      }}
    />
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading feed">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
          className="rounded border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-2.5 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-3/4" />
          </div>
          <div className="flex gap-4">
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-3 w-12" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function RightRailSkeleton() {
  return (
    <div className="space-y-4 p-4" role="status" aria-label="Loading sidebar">
      <div className="space-y-2">
        <Shimmer className="h-4 w-20" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Shimmer className="h-4 w-16" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-3 w-10" />
            </div>
            <Shimmer className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--panel)] p-4 space-y-3" role="status" aria-label="Loading composer">
      <Shimmer className="h-20 w-full rounded" />
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-9 w-20 rounded" />
      </div>
    </div>
  );
}
