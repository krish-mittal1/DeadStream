"use client";

import { motion, AnimatePresence, useMotionValue, useDragControls, useTransform, animate } from "framer-motion";
import {
  Search,
  User,
  Bot,
  MessageSquare,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

const searchCategories = [
  { id: "all", label: "All", icon: Search },
  { id: "posts", label: "Posts", icon: MessageSquare },
  { id: "agents", label: "People", icon: User },
  { id: "communities", label: "Communities", icon: Users },
];

export function SearchModal({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced server-side search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.search(query, category, 5);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, category]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (query) {
          setQuery("");
          return;
        }
        onClose?.();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        const result = results[selectedIndex];
        if (result.type === "post") {
          router.push(`/post/${result.id}`);
        } else if (result.type === "agent") {
          router.push(`/profile/${result.id}`);
        } else if (result.type === "community") {
          router.push("/communities");
        }
        onClose?.();
      }
    },
    [results, selectedIndex, query, onClose, router]
  );

  const resultIcon = (type) => {
    switch (type) {
      case "post":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-blue)]/10 text-[var(--color-blue)]">
            <MessageSquare size={12} />
          </div>
        );
      case "agent":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <Bot size={12} />
          </div>
        );
      case "community":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-violet)]/10 text-[var(--color-violet)]">
            <Users size={12} />
          </div>
        );
    }
  };

const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const [hapticPulse, setHapticPulse] = useState(false);

  // Threshold glow — maps drag distance to a red/orange glow intensity
  const thresholdGlow = useTransform(dragY, [0, 100], [0, 1]);

  // On open, reset drag position
  useEffect(() => {
    if (open) {
      dragY.set(0);
      setHapticPulse(false);
    }
  }, [open]);

  // Track whether threshold has been crossed for haptic feedback
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

  const handleBackdropPress = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose?.();
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
          onClick={handleBackdropPress}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal — swipe down to dismiss */}
          <motion.div
            style={{ y: dragY }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, y: 30 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
            }}
            dragControls={dragControls}
            drag="y"
            dragConstraints={{ top: 0, bottom: 200 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            dragTransition={{ power: 0.1, timeConstant: 250 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={`relative w-full sm:max-w-lg max-w-full sm:rounded-2xl rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-panel)] sm:shadow-2xl overflow-hidden flex flex-col sm:max-h-[80vh] max-h-[85dvh] transition-shadow duration-200 ${
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

            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-line)]">
              <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search posts, agents, communities..."
                className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
              {loading && <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />}
              <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded border border-[var(--color-line-light)] bg-[var(--color-panel-2)] text-[10px] font-semibold text-[var(--color-text-muted)] font-mono">
                Esc
              </kbd>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--color-line)] bg-[var(--color-bg)]/50">
              {searchCategories.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]/60"
                    }`}
                  >
                    <cat.icon size={12} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Results */}
            <div className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2">
              {query && !loading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={24} className="text-[var(--color-text-muted)] mb-2" />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {!query && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={24} className="text-[var(--color-text-dim)] mb-2" />
                  <p className="text-xs text-[var(--color-text-dim)]">
                    Type to search across posts, agents, and communities
                  </p>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {results.map((result, i) => (
                  <motion.button
                    key={`${result.type}-${result.id}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => {
                      if (result.type === "post") {
                        router.push(`/post/${result.id}`);
                      } else if (result.type === "agent") {
                        router.push(`/profile/${result.id}`);
                      } else if (result.type === "community") {
                        router.push("/communities");
                      }
                      onClose?.();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${
                      i === selectedIndex
                        ? "bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30"
                        : "hover:bg-[var(--color-panel-hover)]"
                    }`}
                  >
                    {resultIcon(result.type)}
                    <div className="min-w-0 flex-1">
                      {result.type === "post" && (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                            {result.title || result.body?.slice(0, 60)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            @{result.author_username} &middot;{" "}
                            {result.like_count} likes
                          </p>
                        </>
                      )}
                      {result.type === "agent" && (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            @{result.username}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                            {result.template || "Profile"}
                          </p>
                        </>
                      )}
                      {result.type === "community" && (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {result.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                            {result.member_count} members &middot;{" "}
                            {result.post_count} posts
                          </p>
                        </>
                      )}
                    </div>
                    <ArrowRight
                      size={13}
                      className={`shrink-0 transition-all duration-200 ${
                        i === selectedIndex
                          ? "text-[var(--color-accent)] opacity-100"
                          : "text-[var(--color-text-dim)] opacity-0 group-hover:opacity-100"
                      }`}
                    />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-2.5 text-[10px] text-[var(--color-text-dim)]">
              <span className="flex items-center gap-2">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded border border-[var(--color-line-light)] text-[9px] font-mono font-semibold">
                  &uarr;&darr;
                </kbd>
                <span>navigate</span>
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded border border-[var(--color-line-light)] text-[9px] font-mono font-semibold">
                  &crarr;
                </kbd>
                <span>open</span>
              </span>
              <span>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
