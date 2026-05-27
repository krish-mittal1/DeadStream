"use client";

import {
  ArrowLeft,
  Bookmark,
  MessageCircle,
  ArrowUp,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";
import { UserHoverCard } from "../../components/UserHoverCard";
import { PostCard } from "../../components/feed/PostCard";
import { Lightbox } from "../../components/Lightbox";
import { copyToClipboard } from "../../components/feed/helpers";

export default function BookmarksPage() {
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const like = useSimulationStore((s) => s.like);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleLike = useCallback((postId) => {
    setBookmarkedPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              score: p.liked_by_user ? p.score - 1 : p.score + 1,
              like_count: p.liked_by_user ? p.like_count - 1 : p.like_count + 1,
              liked_by_user: !p.liked_by_user,
            }
          : p
      )
    );
    like(postId).catch(() => {});
  }, [like]);

  const handleBookmark = useCallback((postId) => {
    toggleBookmark(postId).catch(() => {});
  }, [toggleBookmark]);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative flex flex-col items-center justify-center py-28 text-center overflow-hidden"
          >
            {/* Floating bookmark icons */}
            <div className="absolute inset-0 pointer-events-none">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${25 + i * 25}%`,
                    top: `${20 + (i % 2) * 45}%`,
                  }}
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{
                    opacity: [0, 0.12, 0.12, 0],
                    y: [0, -30, -50],
                    rotate: [-10, 0, 10],
                  }}
                  transition={{
                    duration: 5,
                    delay: i * 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Bookmark size={26} className="text-[var(--color-gold)]" />
                </motion.div>
              ))}
            </div>

            {/* Main bookmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative mb-6"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-gold)]/10 to-[var(--color-amber)]/5 shadow-sm">
                <Bookmark size={34} className="text-[var(--color-gold)]" />
              </div>
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2"
                animate={{ scaleY: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="h-1 w-6 rounded-full bg-[var(--color-gold)]/20 blur-sm" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-base font-bold text-[var(--color-text)]"
            >
              No saved posts yet
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-1.5 text-sm text-[var(--color-text-muted)] max-w-xs"
            >
              Bookmark posts you love to save them for later
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              <Link
                href="/feed"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-amber)] px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-[var(--color-gold)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-gold)]/30 hover:scale-105"
              >
                <Search size={15} />
                Browse the feed
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
              <p className="text-[11px] text-[var(--color-text-dim)]">
                Click the bookmark icon on any post to save it
              </p>
            </motion.div>
          </motion.div>
        ) : (
          bookmarkedPosts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              user={user}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onShare={handleShare}
              copiedId={copiedId}
              bookmarkedIds={bookmarkedIds}
              onImageExpand={setLightboxImage}
            />
          ))
        )}
      </div>
      {lightboxImage && (
        <Lightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </motion.div>
  );
}
