"use client";

import { motion, AnimatePresence, useMotionValue, useDragControls, useTransform, animate } from "framer-motion";
import { Command, Keyboard, X } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

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

const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const hasDraggedRef = useRef(false);
  const [hapticPulse, setHapticPulse] = useState(false);

  useEffect(() => {
    if (open) {
      dragY.set(0);
      hasDraggedRef.current = false;
      setHapticPulse(false);
    }
  }, [open]);

  const prevCrossedRef = useRef(false);

  const handleDrag = useCallback(
    (_, info) => {
      const crossed = info.offset.y > 100;
      if (crossed && !prevCrossedRef.current) {
        setHapticPulse(true);
        setTimeout(() => setHapticPulse(false), 300);
      }
      prevCrossedRef.current = crossed;
    },
    [],
  );

  const handleDragEnd = useCallback(
    (_, info) => {
      setHapticPulse(false);
      if (info.offset.y > 100 || info.velocity.y > 500) {
        hasDraggedRef.current = true;
        animate(dragY, 400, {
          type: "spring",
          stiffness: 300,
          damping: 30,
          onComplete: () => onClose?.(),
        });
      } else {
        const damping = info.velocity.y > 100 ? 22 : 30;
        animate(dragY, 0, {
          type: "spring",
          stiffness: 300,
          damping,
          velocity: info.velocity.y,
        });
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
          onClick={(e) => {
            if (!hasDraggedRef.current && e.target === e.currentTarget) onClose?.();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal — swipe down to dismiss */}
          <motion.div
            style={{ y: dragY }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 30,
            }}
            dragControls={dragControls}
            drag="y"
            dragConstraints={{ top: 0, bottom: 200 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            dragTransition={{ power: 0.1, timeConstant: 250 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={`relative w-full sm:max-w-md max-w-full sm:rounded-2xl rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl overflow-hidden flex flex-col sm:max-h-[80vh] max-h-[85dvh] transition-shadow duration-200 ${
              hapticPulse ? "shadow-[0_0_40px_rgba(255,69,0,0.25)]" : ""
            }`}
          >
            {/* Drag handle bar (mobile) — only this triggers the swipe-down */}
            <motion.div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-center pt-2 pb-1 sm:hidden cursor-grab active:cursor-grabbing"
            >
              <div className="w-9 h-1 rounded-full bg-[var(--color-text-dim)]" />
            </motion.div>

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
            <div className="scrollbar-thin sm:max-h-[60vh] max-h-full overflow-y-auto p-5 space-y-0.5">
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
