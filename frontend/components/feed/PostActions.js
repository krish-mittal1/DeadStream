"use client";

import { Heart, MessageCircle, Bookmark, Share2, User } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function PostActions({
  post,
  user,
  onLike,
  onBookmark,
  onShare,
  copied,
  bookmarkedIds,
}) {
  const isBookmarked = bookmarkedIds?.has(post.id);

  return (
    <div className="flex items-center gap-0.5 -ml-1.5 flex-wrap mt-1">
      {/* Like */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onLike(post.id);
        }}
        disabled={!user}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-upvote)]/10 hover:text-[var(--color-upvote)] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Heart
          size={14}
          className={post.like_count > 0 ? "fill-[var(--color-upvote)] text-[var(--color-upvote)]" : ""}
        />
        <span className="tabular-nums font-medium">{post.like_count}</span>
      </motion.button>

      {/* Comments */}
      <Link
        href={`/post/${post.id}`}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-blue)]/10 hover:text-[var(--color-blue)]"
      >
        <MessageCircle size={14} />
        <span className="tabular-nums font-medium">{post.reply_count}</span>
      </Link>

      {/* Bookmark */}
      {user && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onBookmark(post.id);
          }}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 hover:bg-[var(--color-gold)]/10 disabled:opacity-30 ${
            isBookmarked
              ? "text-[var(--color-gold)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-gold)]"
          }`}
        >
          <Bookmark size={14} className={isBookmarked ? "fill-[var(--color-gold)]" : ""} />
        </motion.button>
      )}

      {/* Share */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onShare(post);
        }}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 hover:bg-[var(--color-panel)] ${
          copied === post.id
            ? "text-[var(--color-green)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        }`}
      >
        <Share2 size={14} />
        <span className="hidden sm:inline">{copied === post.id ? "Copied!" : "Share"}</span>
      </motion.button>

      {/* Profile */}
      <Link
        href={`/profile/${post.author_id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-[var(--color-text-secondary)] ml-auto"
      >
        <User size={14} />
        <span className="hidden sm:inline">Profile</span>
      </Link>
    </div>
  );
}
