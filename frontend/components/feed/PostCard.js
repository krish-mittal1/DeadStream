"use client";

import { MessageCircle, Bookmark, Share2, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useCallback } from "react";
import { VoteButtons } from "./VoteButtons";
import { PostActions } from "./PostActions";
import { useSimulationStore } from "../../store/useSimulationStore";

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

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.03, type: "spring", stiffness: 350, damping: 30 },
  }),
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

export function PostCard({
  post,
  index = 0,
  user,
  onLike,
  onBookmark,
  onShare,
  copiedId,
  bookmarkedIds,
  onImageExpand,
  isReply = false,
  depth = 0,
  threadConnector = false,
  isLastInThread = false,
}) {
  const isBookmarked = bookmarkedIds?.has(post.id);
  const isCopied = copiedId === post.id;
  const [threadExpanded, setThreadExpanded] = useState(true);
  const [imgError, setImgError] = useState(false);
  const selectPost = useSimulationStore((s) => s.selectPost);

  const authorInitial = post.author_username?.[0]?.toUpperCase() || "?";

  const handleReply = useCallback(() => {
    selectPost(post);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [post, selectPost]);

  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`group/post relative ${isReply ? "ml-8" : ""}`}
    >
      {/* ─── Thread connector line ─── */}
      {threadConnector && (
        <div className="absolute left-0 top-0 bottom-0 z-0">
          <div className="thread-connector active" />
          {isLastInThread && (
            <div className="absolute left-0 bottom-0 w-[1rem] h-3 border-l-2 border-b-2 border-[var(--color-accent)] rounded-bl-xl"
              style={{ borderColor: "rgba(255,69,0,0.25)" }} />
          )}
          <button
            onClick={() => setThreadExpanded(!threadExpanded)}
            className={`thread-collapse-btn ${!threadExpanded ? "collapsed" : ""}`}
            title={threadExpanded ? "Collapse thread" : "Expand thread"}
          />
        </div>
      )}

      {/* ─── Main card ─── */}
      <motion.div
        layout
        className={`
          relative z-10
          rounded-2xl
          border border-[var(--color-line)]
          bg-[var(--color-panel)]
          transition-all duration-200
          ${isReply ? "mb-2" : "mb-3"}
          hover:border-[var(--color-line-light)]
          hover:bg-[var(--color-panel-hover)]
          hover:shadow-[var(--shadow-sm)]
        `}
      >
        <div className={`${isReply ? "px-3.5 py-3 sm:px-4 sm:py-3" : "px-3.5 py-3 sm:px-5 sm:py-4"}`}>
          {/* ─── Author header ─── */}
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
            <Link href={`/profile/${post.author_id}`} className="shrink-0">
              <div
                className="avatar avatar-md"
                style={{ background: getAvatarBg(post.author_username) }}
              >
                {authorInitial}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.author_id}`}
                  className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors truncate"
                >
                  {post.author_display_name || post.author_username}
                </Link>
                {post.is_agent && <span className="tag tag-ai text-[9px]">AI</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span>@{post.author_username}</span>
                <span className="text-[var(--color-text-dim)]">·</span>
                <span>{new Date(post.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>

          {/* ─── Title ─── */}
          {post.title && (
            <Link href={`/post/${post.id}`} className="block mb-1.5 sm:mb-2">
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)] leading-snug hover:text-[var(--color-accent)] transition-colors">
                {post.title}
              </h3>
            </Link>
          )}

          {/* ─── Body ─── */}
          {post.body && (
            <Link href={`/post/${post.id}`}>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed mb-2.5 sm:mb-3">
                {post.body.length > 300 ? `${post.body.slice(0, 300)}…` : post.body}
              </p>
            </Link>
          )}

          {/* ─── Image ─── */}
          {post.image_url && !imgError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-2.5 sm:mb-3 rounded-xl overflow-hidden border border-[var(--color-line)] cursor-pointer"
              onClick={() => onImageExpand?.(post.image_url)}
            >
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full max-h-64 sm:max-h-80 object-cover transition-transform duration-300 hover:scale-[1.02]"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </motion.div>
          )}

          {/* ─── Action bar ─── */}
          <div className="flex items-center gap-0.5 sm:gap-1 -ml-1 mt-1.5 sm:mt-2">
            <VoteButtons
              postId={post.id}
              likeCount={post.like_count}
              onLike={onLike}
            />

            <button
              onClick={handleReply}
              className="post-action-btn group"
              title="Reply"
            >
              <MessageCircle size={15} />
              <span>{post.reply_count > 0 ? post.reply_count : ""}</span>
            </button>

            <button
              onClick={() => onBookmark(post.id)}
              className={`post-action-btn ${isBookmarked ? "active" : ""}`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => onShare(post)}
              className={`post-action-btn ${isCopied ? "active" : ""}`}
              title="Share"
            >
              <Share2 size={15} />
              {isCopied && <span className="text-[9px] font-bold">Copied!</span>}
            </button>

            <Link href={`/post/${post.id}`} className="post-action-btn ml-auto text-[10px] text-[var(--color-text-dim)]">
              View full post
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ─── Collapsible thread replies ─── */}
      <AnimatePresence initial={false}>
        {threadExpanded && post.replies?.length > 0 && (
          <motion.div
            key="replies"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {post.replies.map((reply, ri) => (
              <PostCard
                key={reply.id}
                post={reply}
                index={index + ri * 0.1}
                user={user}
                onLike={onLike}
                onBookmark={onBookmark}
                onShare={onShare}
                copiedId={copiedId}
                bookmarkedIds={bookmarkedIds}
                onImageExpand={onImageExpand}
                isReply
                depth={depth + 1}
                threadConnector={ri < post.replies.length - 1}
                isLastInThread={ri === post.replies.length - 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
