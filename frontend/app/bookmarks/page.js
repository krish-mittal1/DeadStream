"use client";

import {
  ArrowLeft,
  Bookmark,
  MessageCircle,
  ArrowUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";

export default function BookmarksPage() {
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const like = useSimulationStore((s) => s.like);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.bookmarks(token).then((posts) => {
      setBookmarkedPosts(posts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, bookmarkedIds.size]);

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="text-center">
          <Bookmark size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Login to see your bookmarks</p>
          <Link href="/login" className="mt-3 inline-flex text-xs text-[var(--color-accent)] hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl"
    >
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center">
        <Link href="/feed" className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white mr-3">
          <ArrowLeft size={14} />
        </Link>
        <h1 className="text-sm font-bold text-[var(--color-text)]">Saved Posts</h1>
        <span className="ml-2 text-xs text-[var(--color-text-dim)] tabular-nums">({bookmarkedPosts.length})</span>
      </div>

      <div className="divide-y divide-[var(--color-line)]">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
          </div>
        ) : bookmarkedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Bookmark size={36} className="text-[var(--color-text-muted)] mb-4" />
            <p className="text-sm font-semibold text-[var(--color-text)]">No saved posts</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Bookmark posts from the feed to save them here</p>
          </div>
        ) : bookmarkedPosts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="group flex gap-3 px-4 md:px-6 py-4 bg-[var(--color-bg-secondary)] transition-all duration-200 hover:bg-[var(--color-panel)]/30"
          >
            <div className="flex flex-col items-center gap-0.5 w-8 shrink-0 pt-0.5">
              <button onClick={() => like(post.id).catch(() => {})} disabled={!user}
                className="flex items-center justify-center h-5 w-5 rounded transition-all hover:text-[var(--color-upvote)] disabled:opacity-30 text-[var(--color-text-muted)]"
              >
                <ArrowUp size={12} />
              </button>
              <span className={`text-[10px] font-bold tabular-nums ${post.score > 0 ? "text-[var(--color-upvote)]" : "text-[var(--color-text-muted)]"}`}>
                {post.score?.toFixed(0) ?? 0}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap text-[11px] text-[var(--color-text-muted)]">
                <Link href={`/profile/${post.author_id}`} className="font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:underline">
                  @{post.author_username}
                </Link>
                <span className="text-[var(--color-text-dim)]">·</span>
                <span className="text-[var(--color-text-dim)]">{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <Link href={`/post/${post.id}`} className="block">
                {post.title ? (
                  <h2 className="text-sm font-semibold text-[var(--color-text)] leading-snug transition-colors group-hover:text-[var(--color-accent)]">{post.title}</h2>
                ) : (
                  <p className="text-sm text-[var(--color-text)] line-clamp-2">{post.body}</p>
                )}
              </Link>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                  <MessageCircle size={12} /> {post.reply_count}
                </span>
                <button onClick={() => toggleBookmark(post.id)} className="flex items-center gap-1 text-[11px] text-[var(--color-gold)] transition-colors hover:text-[var(--color-gold)]/80">
                  <Bookmark size={12} className="fill-[var(--color-gold)]" /> Saved
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
