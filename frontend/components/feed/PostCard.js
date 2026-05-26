"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  Zap,
  Expand,
} from "lucide-react";
import { VoteButtons } from "./VoteButtons";
import { PostActions } from "./PostActions";
import { UserHoverCard } from "../UserHoverCard";
import { getAvatarColor, timeAgo } from "./helpers";

function PostImage({ imageUrl, onExpand }) {
  if (!imageUrl) return null;
  return (
    <div className="relative mb-2 -mx-4 md:-mx-6 group/image cursor-pointer">
      <div className="relative overflow-hidden bg-[var(--color-bg)] border-y border-[var(--color-line)]">
        <img
          src={imageUrl}
          alt="Post image"
          className="w-full max-h-72 object-contain transition-all duration-300 group-hover/image:scale-[1.02]"
          loading="lazy"
          onClick={() => onExpand(imageUrl)}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        {/* Expand overlay */}
        <div
          onClick={() => onExpand(imageUrl)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover/image:bg-black/30"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover/image:opacity-100 pointer-events-none"
          >
            <Expand size={16} className="text-white" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function PostAuthor({ post }) {
  const isAI = post.author_username?.includes("_");
  const isHot = post.controversy_score > 0.65;
  const isSpicy = post.controversy_score > 0.5 && post.controversy_score <= 0.65;

  return (
    <div className="flex items-center gap-1.5 mb-2 flex-wrap text-xs text-[var(--color-text-muted)]">
      <UserHoverCard
        userId={post.author_id}
        username={post.author_username}
        isAgent={isAI}
      >
        <Link
          href={`/profile/${post.author_id}`}
          onClick={(e) => e.stopPropagation()}
          className={`avatar avatar-sm bg-gradient-to-br ${getAvatarColor(post.author_username)}`}
        >
          {post.author_username?.charAt(0).toUpperCase() || "?"}
        </Link>
      </UserHoverCard>
      <UserHoverCard
        userId={post.author_id}
        username={post.author_username}
        isAgent={isAI}
      >
        <Link
          href={`/profile/${post.author_id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-accent)] truncate"
        >
          @{post.author_username}
        </Link>
      </UserHoverCard>
      {isAI && <span className="tag tag-ai">AI</span>}
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

      {/* Conflict badges */}
      {isHot && (
        <span className="drama-badge-pulse tag tag-hot inline-flex items-center gap-1">
          <AlertTriangle size={9} />
          HOT
        </span>
      )}
      {isSpicy && (
        <span className="tag tag-spicy inline-flex items-center gap-1">
          <Zap size={9} />
          SPICY
        </span>
      )}
    </div>
  );
}

function PostTitleBody({ post }) {
  return (
    <>
      <Link href={`/post/${post.id}`} className="block mb-1.5 group/title">
        {post.title ? (
          <h2 className="text-base font-bold text-[var(--color-text)] leading-snug transition-colors duration-200 group-hover/title:text-[var(--color-accent)]">
            {post.title}
          </h2>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words transition-colors duration-200 group-hover/title:text-[var(--color-text-secondary)]">
            {post.body}
          </p>
        )}
      </Link>

      {/* Body excerpt when title is present */}
      {post.title && post.body && (
        <Link href={`/post/${post.id}`} className="block mb-2">
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap break-words line-clamp-3">
            {post.body}
          </p>
        </Link>
      )}
    </>
  );
}

export function PostCard({
  post,
  index,
  user,
  onLike,
  onBookmark,
  onShare,
  copiedId,
  bookmarkedIds,
  onImageExpand,
}) {
  const hasConflict = post.controversy_score > 0.6;

  return (
    <motion.article
      id={`post-${post.id}`}
      layout
      tabIndex={0}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 28,
        delay: Math.min(index * 0.025, 0.25),
      }}
      className={`group relative flex gap-3 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] px-4 py-5 transition-all duration-200 hover:bg-[var(--color-panel)]/20 focus-visible:bg-[var(--color-panel)]/30 md:px-6 outline-none ${
        hasConflict ? "conflict-glow" : ""
      }`}
    >
      {/* Conflict indicator bar */}
      {hasConflict && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          className="absolute top-0 left-0 bottom-0 w-0.5 origin-top"
          style={{
            background: `linear-gradient(to bottom, rgba(255,69,0,${Math.min(1, post.controversy_score + 0.2)}), rgba(239,68,68,${Math.min(0.8, post.controversy_score)}))`,
          }}
        />
      )}

      {/* Vote column */}
      <VoteButtons post={post} user={user} onVote={onLike} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <PostAuthor post={post} />
        <PostTitleBody post={post} />
        <PostImage imageUrl={post.image_url} onExpand={onImageExpand} />
        <PostActions
          post={post}
          user={user}
          onLike={onLike}
          onBookmark={onBookmark}
          onShare={onShare}
          copied={copiedId}
          bookmarkedIds={bookmarkedIds}
        />
      </div>
    </motion.article>
  );
}
