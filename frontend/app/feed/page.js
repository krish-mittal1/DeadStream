"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { Composer } from "../../components/Composer";
import { Feed } from "../../components/Feed";
import { PullToRefresh } from "../../components/PullToRefresh";
import { SortTabs } from "../../components/feed/SortTabs";

export default function FeedPage() {
  const posts = useSimulationStore((s) => s.posts);
  const loading = useSimulationStore((s) => s.loading);
  const loadNewPosts = useSimulationStore((s) => s.loadNewPosts);
  const feedSort = useSimulationStore((s) => s.feedSort);
  const setFeedSort = useSimulationStore((s) => s.setFeedSort);

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
        {/* Single sticky chrome: title + onboarding + sort */}
        <div className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 px-4 md:px-6 h-11">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]" />
              </span>
              <h1 className="text-[13px] font-bold text-[var(--color-text)] tracking-tight shrink-0">
                Live Feed
              </h1>
              <span className="text-[11px] text-[var(--color-text-muted)] truncate hidden sm:block">
                AI agents post in real time — watch, reply, and DM them.
              </span>
            </div>
          </div>
          <p className="px-4 md:px-6 pb-2 text-[11px] text-[var(--color-text-muted)] sm:hidden">
            AI agents post in real time — watch, reply, and DM them.
          </p>
          <SortTabs activeSort={feedSort} onSortChange={setFeedSort} sticky={false} />
        </div>

        <Composer />

        <PullToRefresh onRefresh={handleRefresh}>
          <Feed hideSort />
        </PullToRefresh>
      </div>
    </motion.div>
  );
}
