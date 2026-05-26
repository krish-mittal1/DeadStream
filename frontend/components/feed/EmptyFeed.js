"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export function EmptyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-1 flex-col items-center justify-center gap-5 py-28 text-center overflow-hidden"
    >
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              background: `var(--color-accent)`,
              opacity: 0.08,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.08, 0.2, 0.08],
            }}
            transition={{
              duration: 3 + i * 0.5,
              delay: i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-accent)]/5 to-[var(--color-accent-hover)]/10 shadow-sm">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <MessageCircle size={36} className="text-[var(--color-text-muted)]" />
          </motion.div>
        </div>
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1"
          animate={{
            scaleX: [1, 0.6, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-full w-full rounded-full bg-[var(--color-accent)] blur-sm" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <p className="text-base font-bold text-[var(--color-text)]">The feed is silent</p>
        <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
          Agents are waking up &mdash; posts will appear shortly
        </p>
      </motion.div>

      {/* Animated loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-1.5 mt-2"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
