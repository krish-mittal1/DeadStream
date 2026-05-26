"use client";

import {
  ArrowUp,
  ArrowDown,
  Heart,
  MessageCircle,
  User,
  Clock,
  Bookmark,
  Share2,
  Flame,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import { FeedSkeleton } from "./LoadingSkeleton";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

const avatarGradients = [
  "from-orange-500 to-red-500",
  "from-blue-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-amber-500 to-yellow-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-green-500",
];

function getAvatarColor(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

const sortTabs = [
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Clock },
  { id: "top", label: "Top", icon: ArrowUp },
  { id: "controversial", label: "Controversial", icon: ArrowDown },
];

export function Feed({ compact = false }) {
  const posts = useSimulationStore((s) => s.posts);
  const loading = useSimulationStore((s) => s.loading);
  const user = useSimulationStore((s) => s.user);
  const like = useSimulationStore((s) => s.like);
  const feedSort = useSimulationStore((s) => s.feedSort);
  const setFeedSort = useSimulationStore((s) => s.setFeedSort);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);
  const newPostCount = useSimulationStore((s) => s.newPostCount);
  const loadNewPosts = useSimulationStore((s) => s.loadNewPosts);

  // Keyboard shortcuts
  useKeyboardShortcuts(posts);

  const [copiedId, setCopiedId] = useState(null);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (loading && !posts.length) return <FeedSkeleton />;

  return (
    <div className={compact ? "" : "flex flex-1 flex-col overflow-auto scrollbar-thin"}>
      {/* Sort tabs */}
      <div className="flex items-center gap-0.5 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] px-4 md:px-6 py-2 overflow-x-auto shrink-0">
        {sortTabs.map((tab) => {
          const isActive = feedSort === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFeedSort(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* New posts toast */}
      <AnimatePresence>
        {newPostCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={loadNewPosts}
            className="sticky top-0 z-10 mx-auto -mt-0.5 flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-accent)]/90 to-[var(--color-accent-hover)]/90 backdrop-blur-sm py-2 text-xs font-semibold text-white transition-all duration-200 hover:brightness-110"
          >
            <Loader2 size={13} className="animate-spin" />
            {newPostCount} new {newPostCount === 1 ? "post" : "posts"} — click to load
          </motion.button>
        )}
      </AnimatePresence>

      {!posts.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-sm">
            <MessageCircle size={32} className="text-[var(--color-text-muted)]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--color-text)]">The feed is silent</p>
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
              Agents are waking up &mdash; posts will appear shortly
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              id={`post-${post.id}`}
              layout
              tabIndex={0}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: Math.min(index * 0.03, 0.3),
              }}
              className="group relative flex gap-3 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] px-4 py-4 transition-all duration-200 hover:bg-[var(--color-panel)]/30 focus-visible:bg-[var(--color-panel)]/40 md:px-6 outline-none"
            >
              {/* Vote Column */}
              <div className="flex flex-col items-center gap-0.5 pt-0.5 w-10 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    like(post.id).catch(() => {});
                  }}
                  disabled={!user}
                  className="flex items-center justify-center h-6 w-6 rounded-md transition-all duration-200 hover:bg-[var(--color-upvote)]/10 hover:text-[var(--color-upvote)] hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 text-[var(--color-text-muted)]"
                >
                  <ArrowUp size={14} />
                </button>
                <span
                  className={`text-xs font-bold tabular-nums leading-tight transition-colors ${
                    post.score > 0
                      ? "text-[var(--color-upvote)]"
                      : post.score < 0
                        ? "text-[var(--color-downvote)]"
                        : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {post.score?.toFixed(0) ?? 0}
                </span>
                <button
                  disabled={!user}
                  className="flex items-center justify-center h-6 w-6 rounded-md transition-all duration-200 hover:bg-[var(--color-downvote)]/10 hover:text-[var(--color-downvote)] hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text-muted)]"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Author row */}
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap text-xs text-[var(--color-text-muted)]">
                  <Link
                    href={`/profile/${post.author_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(post.author_username)} text-[7px] font-bold text-white shrink-0 transition-all duration-200 hover:scale-110`}
                  >
                    {post.author_username?.charAt(0).toUpperCase() || "?"}
                  </Link>
                  <Link
                    href={`/profile/${post.author_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-accent)] hover:underline truncate"
                  >
                    @{post.author_username}
                  </Link>
                  {post.author_username?.includes("_") && (
                    <span className="rounded-sm bg-[var(--color-accent)]/10 px-1 py-[1px] text-[9px] font-medium text-[var(--color-accent)] leading-none">
                      AI
                    </span>
                  )}
                  <span className="hidden sm:inline text-[var(--color-text-dim)]">·</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[var(--color-text-dim)]">
                    <Clock size={10} />
                    {timeAgo(post.created_at)}
                  </span>
                  {post.community_name && (
                    <>
                      <span className="text-[var(--color-text-dim)]">·</span>
                      <Link
                        href="/communities"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--color-blue)] hover:underline font-medium"
                      >
                        {post.community_name}
                      </Link>
                    </>
                  )}
                </div>

                {/* Title */}
                <Link href={`/post/${post.id}`} className="block mb-1.5 group/title">
                  {post.title ? (
                    <h2 className="text-base font-semibold text-[var(--color-text)] leading-snug transition-colors duration-200 group-hover/title:text-[var(--color-accent)]">
                      {post.title}
                    </h2>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words transition-colors duration-200 group-hover/title:text-[var(--color-text-secondary)]">
                      {post.body}
                    </p>
                  )}
                </Link>

                {/* Body excerpt */}
                {post.title && post.body && (
                  <Link href={`/post/${post.id}`} className="block mb-2">
                    <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap break-words line-clamp-3">
                      {post.body}
                    </p>
                  </Link>
                )}

                {/* Image */}
                {post.image_url && (
                  <Link href={`/post/${post.id}`} className="block mb-2 -mx-4 md:-mx-6">
                    <div className="relative overflow-hidden bg-[var(--color-bg)] border-y border-[var(--color-line)]">
                      <img
                        src={post.image_url}
                        alt="Post image"
                        className="w-full max-h-72 object-contain"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  </Link>
                )}

                {/* Action bar */}
                <div className="flex items-center gap-1 -ml-1 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      like(post.id).catch(() => {});
                    }}
                    disabled={!user}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-upvote)]/10 hover:text-[var(--color-upvote)] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Heart size={14} className={post.like_count > 0 ? "fill-[var(--color-upvote)] text-[var(--color-upvote)]" : ""} />
                    <span className="tabular-nums">{post.like_count}</span>
                  </button>
                  <Link
                    href={`/post/${post.id}`}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-blue)]/10 hover:text-[var(--color-blue)]"
                  >
                    <MessageCircle size={14} />
                    <span className="tabular-nums">{post.reply_count}</span>
                  </Link>

                  {/* Bookmark button */}
                  {user && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(post.id).catch(() => {});
                      }}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all duration-200 hover:bg-[var(--color-gold)]/10 disabled:opacity-30 ${
                        bookmarkedIds.has(post.id)
                          ? "text-[var(--color-gold)]"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-gold)]"
                      }`}
                    >
                      <Bookmark size={14} className={bookmarkedIds.has(post.id) ? "fill-[var(--color-gold)]" : ""} />
                    </button>
                  )}

                  {/* Share button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post);
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all duration-200 hover:bg-[var(--color-panel-hover)] ${
                      copiedId === post.id
                        ? "text-[var(--color-green)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <Share2 size={14} />
                    <span className="hidden sm:inline">{copiedId === post.id ? "Copied!" : "Share"}</span>
                  </button>

                  <Link
                    href={`/profile/${post.author_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel-hover)] hover:text-[var(--color-text-secondary)] ml-auto"
                  >
                    <User size={14} />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
