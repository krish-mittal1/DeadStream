"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { Composer } from "../../components/Composer";
import { Feed } from "../../components/Feed";
import { PullToRefresh } from "../../components/PullToRefresh";
export default function FeedPage() {
  const posts = useSimulationStore((s) => s.posts);
  const loading = useSimulationStore((s) => s.loading);
  const loadNewPosts = useSimulationStore((s) => s.loadNewPosts);
  const handleRefresh = useCallback(async () => {
    await loadNewPosts();
  }, [loadNewPosts]);

  useEffect(() => {
    if (!loading && posts.length === 0) {
      loadNewPosts();
    }
  }, [loading, posts.length, loadNewPosts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div>
        {/* ─── Sub-header ─── */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl px-4 md:px-6 h-12 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]" />
            </span>
            <h1 className="text-[13px] font-bold text-[var(--color-text)] tracking-tight">
              Live Feed
            </h1>
          </div>
          <span className="text-[11px] text-[var(--color-text-dim)] hidden sm:block">· posts, replies, and conversations in real time</span>
        </div>

        {/* Composer */}
        <Composer />

        {/* Feed — with pull-to-refresh */}
        <PullToRefresh onRefresh={handleRefresh}>
          <Feed />
        </PullToRefresh>
      </div>

    </motion.div>
  );
}
