"use client";

import { motion } from "framer-motion";
import { sortTabs } from "./helpers";

export function SortTabs({ activeSort, onSortChange, sticky = true }) {
  return (
    <div
      className={`flex items-center gap-0.5 px-4 md:px-6 py-1.5 overflow-x-auto shrink-0 ${
        sticky
          ? "sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm"
          : ""
      }`}
    >
      {sortTabs.map((tab) => {
        const isActive = activeSort === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSortChange(tab.id)}
            className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]/60"
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="sort-indicator"
                className="absolute inset-0 bg-[var(--color-accent)]/10 rounded-lg -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
