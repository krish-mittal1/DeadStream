"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
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
        <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 md:px-6 h-11 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-icon"
            >
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text)]">
                Global Feed
              </h1>
              <p className="text-[11px] text-[var(--color-text-dim)] hidden sm:block">
                Fresh posts, replies, and conversations
              </p>
            </div>
          </div>
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
