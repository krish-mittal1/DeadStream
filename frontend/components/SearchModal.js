"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bot,
  MessageSquare,
  Users,
  Flame,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "../store/useSimulationStore";

const searchCategories = [
  { id: "all", label: "All", icon: Search },
  { id: "posts", label: "Posts", icon: MessageSquare },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "communities", label: "Communities", icon: Users },
];

export function SearchModal({ open, onClose }) {
  const router = useRouter();
  const posts = useSimulationStore((s) => s.posts);
  const agents = useSimulationStore((s) => s.agents);
  const communities = useSimulationStore((s) => s.communities);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const filteredResults = (() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const postResults =
      category === "all" || category === "posts"
        ? posts
            .filter(
              (p) =>
                p.title?.toLowerCase().includes(q) ||
                p.body?.toLowerCase().includes(q) ||
                p.author_username?.toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map((p) => ({ type: "post", data: p }))
        : [];

    const agentResults =
      category === "all" || category === "agents"
        ? agents
            .filter(
              (a) =>
                a.username?.toLowerCase().includes(q) ||
                a.template?.toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map((a) => ({ type: "agent", data: a }))
        : [];

    const communityResults =
      category === "all" || category === "communities"
        ? communities
            .filter(
              (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.description?.toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map((c) => ({ type: "community", data: c }))
        : [];

    const all = [
      ...postResults,
      ...agentResults,
      ...communityResults,
    ];
    return all;
  })();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category]);

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
        setSelectedIndex((i) => Math.min(i + 1, filteredResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filteredResults[selectedIndex]) {
        e.preventDefault();
        const result = filteredResults[selectedIndex];
        if (result.type === "post") {
          router.push(`/post/${result.data.id}`);
        } else if (result.type === "agent") {
          router.push(`/profile/${result.data.id}`);
        } else if (result.type === "community") {
          router.push("/communities");
        }
        onClose?.();
      }
    },
    [filteredResults, selectedIndex, query, onClose, router]
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4"
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
            ref={resultsRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
            }}
            className="relative w-full max-w-lg rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl overflow-hidden"
          >
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
              {query && filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={24} className="text-[var(--color-text-muted)] mb-2" />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No results for "{query}"
                  </p>
                </div>
              )}

              {!query && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={24} className="text-[var(--color-text-dim)] mb-2" />
                  <p className="text-xs text-[var(--color-text-dim)]">
                    Type to search across posts, agents, and communities
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-[var(--color-text-dim)]">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-blue)]" />{" "}
                      {posts.length} posts
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />{" "}
                      {agents.length} agents
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-violet)]" />{" "}
                      {communities.length} communities
                    </span>
                  </div>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {filteredResults.map((result, i) => (
                  <motion.button
                    key={`${result.type}-${result.data.id}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => {
                      if (result.type === "post") {
                        router.push(`/post/${result.data.id}`);
                      } else if (result.type === "agent") {
                        router.push(`/profile/${result.data.id}`);
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
                            {result.data.title || result.data.body?.slice(0, 60)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            @{result.data.author_username} ·{" "}
                            {result.data.like_count} likes
                          </p>
                        </>
                      )}
                      {result.type === "agent" && (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            @{result.data.username}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                            {result.data.template || "AI Agent"}
                          </p>
                        </>
                      )}
                      {result.type === "community" && (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {result.data.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">
                            {result.data.member_count} members ·{" "}
                            {result.data.post_count} posts
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
                  ↑↓
                </kbd>
                <span>navigate</span>
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded border border-[var(--color-line-light)] text-[9px] font-mono font-semibold">
                  ↵
                </kbd>
                <span>open</span>
              </span>
              <span>
                {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
