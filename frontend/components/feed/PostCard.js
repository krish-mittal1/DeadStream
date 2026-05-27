"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, Clock, Expand, Zap } from "lucide-react";
import { VoteButtons } from "./VoteButtons";
import { PostActions } from "./PostActions";
import { UserHoverCard } from "../UserHoverCard";
import { getAvatarColor, timeAgo } from "./helpers";

const avatarGradients = [
  "linear-gradient(135deg,#ff4500,#ff6534)",
  "linear-gradient(135deg,#4f8cff,#9b6cff)",
  "linear-gradient(135deg,#10d48e,#14b8a6)",
  "linear-gradient(135deg,#fb4785,#f5a623)",
  "linear-gradient(135deg,#9b6cff,#4f8cff)",
  "linear-gradient(135deg,#f5a623,#ff4500)",
  "linear-gradient(135deg,#22d3ee,#4f8cff)",
  "linear-gradient(135deg,#2ecc71,#10d48e)",
];

function getAvatarBg(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

function PostImage({ imageUrl, onExpand }) {
  if (!imageUrl) return null;
  return (
    <div className="relative my-3 -mx-4 md:-mx-5 group/img cursor-pointer overflow-hidden">
      <div className="relative bg-[var(--color-bg)] border-y border-[var(--color-line)]">
        <img
          src={imageUrl}
          alt="Post image"
          className="w-full max-h-80 object-contain transition-transform duration-500 group-hover/img:scale-[1.015]"
          loading="lazy"
          onClick={() => onExpand(imageUrl)}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div
          onClick={() => onExpand(imageUrl)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/img:bg-black/25 transition-all duration-300"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-all duration-300 pointer-events-none"
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
    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
      <UserHoverCard userId={post.author_id} username={post.author_username} isAgent={isAI}>
        <Link
          href={`/profile/${post.author_id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-black transition-transform duration-200 hover:scale-110"
          style={{ background: getAvatarBg(post.author_username) }}
        >
          {post.author_username?.charAt(0).toUpperCase() || "?"}
        </Link>
      </UserHoverCard>

      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <UserHoverCard userId={post.author_id} username={post.author_username} isAgent={isAI}>
          <Link
            href={`/profile/${post.author_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors truncate"
          >
            @{post.author_username}
          </Link>
        </UserHoverCard>

        {isAI && <span className="tag tag-ai shrink-0">AI</span>}

        {post.community_name && (
          <>
            <span className="text-[var(--color-text-dim)] text-xs">in</span>
            <Link
              href="/communities"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold text-[var(--color-blue)] hover:underline shrink-0"
            >
              {post.community_name}
            </Link>
          </>
        )}

        <span className="text-[var(--color-text-dim)] text-xs shrink-0 flex items-center gap-1">
          <Clock size={9} />
          {timeAgo(post.created_at)}
        </span>

        {isHot && (
          <span className="tag tag-hot inline-flex items-center gap-1 shrink-0 drama-badge-pulse">
            <AlertTriangle size={8} /> HOT
          </span>
        )}
        {isSpicy && !isHot && (
          <span className="tag tag-spicy inline-flex items-center gap-1 shrink-0">
            <Zap size={8} /> SPICY
          </span>
        )}
      </div>
    </div>
  );
}

function PostContent({ post }) {
  return (
    <>
      <Link href={`/post/${post.id}`} className="block group/title mb-1">
        {post.title ? (
          <h2 className="text-[15px] font-bold leading-snug text-[var(--color-text)] group-hover/title:text-[var(--color-accent)] transition-colors duration-150">
            {post.title}
          </h2>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-words group-hover/title:text-[var(--color-text-secondary)] transition-colors">
            {post.body}
          </p>
        )}
      </Link>

      {post.title && post.body && (
        <Link href={`/post/${post.id}`} className="block mb-1">
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap break-words line-clamp-3">
            {post.body}
          </p>
        </Link>
      )}
    </>
  );
}

export function PostCard({
  post, index, user, onLike, onBookmark, onShare,
  copiedId, bookmarkedIds, onImageExpand,
}) {
  const hasConflict = post.controversy_score > 0.6;

  return (
    <motion.article
      id={`post-${post.id}`}
      layout
      tabIndex={0}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 26,
        delay: Math.min(index * 0.022, 0.22),
      }}
      className={`group relative flex gap-0 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] transition-all duration-200 hover:bg-[var(--color-panel)]/25 focus-visible:bg-[var(--color-panel)]/30 outline-none ${
        hasConflict ? "conflict-glow" : ""
      }`}
    >
      {/* Conflict bar */}
      {hasConflict && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          className="absolute top-0 left-0 bottom-0 w-[3px] origin-top rounded-r-full"
          style={{
            background: `linear-gradient(to bottom, rgba(255,69,0,${Math.min(1, post.controversy_score + 0.15)}), rgba(239,68,68,${Math.min(0.7, post.controversy_score)}))`,
          }}
        />
      )}

      {/* Vote column */}
      <div className="flex flex-col items-center pt-3 pl-2 pr-1 shrink-0">
        <VoteButtons post={post} user={user} onVote={onLike} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 px-3 py-3 md:py-4 md:pr-5">
        <PostAuthor post={post} />
        <PostContent post={post} />
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
