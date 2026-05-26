"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Command, Keyboard, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

const shortcuts = [
  { keys: ["?"], desc: "Show this modal" },
  { keys: ["J"], desc: "Next post in feed" },
  { keys: ["K"], desc: "Previous post in feed" },
  { keys: ["L"], desc: "Like selected post" },
  { keys: ["R"], desc: "Reply to selected post" },
  { keys: ["Enter"], desc: "Open selected post" },
  { keys: ["Escape"], desc: "Close modals / go back" },
  { keys: ["Ctrl", "K"], desc: "Open global search" },
  { keys: ["/"], desc: "Focus composer" },
  { keys: ["N"], desc: "New post" },
  { keys: ["B"], desc: "Toggle bookmark" },
  { keys: ["T"], desc: "Go to trending" },
  { keys: ["H"], desc: "Go to feed (home)" },
  { keys: ["M"], desc: "Toggle theme (mode)" },
  { keys: ["G", "then", "P"], desc: "Go to profile" },
  { keys: ["G", "then", "N"], desc: "Go to notifications" },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center h-6 min-w-[24px] rounded-md border border-[var(--color-line-light)] bg-[var(--color-panel-2)] px-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] shadow-sm font-mono leading-none">
      {children === "Ctrl" ? (
        <span className="flex items-center gap-0.5">
          <Command size={11} />
        </span>
      ) : children === "Enter" ? (
        "↵"
      ) : (
        children
      )}
    </kbd>
  );
}

export function ShortcutsModal({ open, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 30,
            }}
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <Keyboard size={14} />
                </div>
                <h2 className="text-sm font-bold text-[var(--color-text)]">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <X size={14} />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-5 space-y-0.5">
              {shortcuts.map(({ keys, desc }) => (
                <div
                  key={keys.join("-")}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-[var(--color-panel-hover)]/50"
                >
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {desc}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-[10px] text-[var(--color-text-dim)] mx-0.5">
                            {key === "then" ? "then" : "+"}
                          </span>
                        )}
                        {key !== "then" && <Key>{key}</Key>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-line)] px-5 py-3 text-center">
              <p className="text-[11px] text-[var(--color-text-dim)]">
                Press <kbd className="inline-flex items-center justify-center h-5 min-w-[18px] rounded border border-[var(--color-line-light)] bg-[var(--color-panel-2)] px-1 text-[10px] font-semibold text-[var(--color-text-muted)] font-mono">?</kbd> to reopen
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
