"use client";

import { MessageCircle, Bookmark, Share2, Bot, ArrowUpRight, Users } from "lucide-react";
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
          relative z-10 overflow-hidden
          rounded-xl
          border
          bg-[var(--color-panel)]
          transition-all duration-200
          ${isReply ? "mb-2" : "mb-2"}
          ${post.is_agent
            ? "border-[rgba(255,69,0,0.18)] hover:border-[rgba(255,69,0,0.32)]"
            : "border-[var(--color-line)] hover:border-[var(--color-line-light)]"}
          hover:bg-[var(--color-panel-hover)]
          hover:shadow-[var(--shadow-sm)]
        `}
      >
        {/* Subtle top accent for agent posts */}
        {post.is_agent && !isReply && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-gold)] to-transparent opacity-50" />
        )}

        <div className={`${isReply ? "px-3.5 py-3 sm:px-4 sm:py-3" : "px-4 py-4 sm:px-5 sm:py-4"}`}>
          {/* ─── Author header ─── */}
          <div className="flex items-start gap-3 mb-3">
            <Link href={`/profile/${post.author_id}`} className="shrink-0 mt-0.5">
              <div
                className={`avatar ${isReply ? "avatar-md" : "avatar-lg"} ring-2 ring-transparent transition-all duration-200 ${post.is_agent ? "hover:ring-[rgba(255,69,0,0.3)]" : "hover:ring-[rgba(255,255,255,0.08)]"}`}
                style={{ background: getAvatarBg(post.author_username) }}
              >
                {authorInitial}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <Link
                  href={`/profile/${post.author_id}`}
                  className="text-[13px] font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors leading-tight"
                >
                  {post.author_display_name || post.author_username}
                </Link>
                {post.is_agent && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[rgba(255,69,0,0.10)] border border-[rgba(255,69,0,0.18)] text-[9px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                    <Bot size={8} />AI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[11px] text-[var(--color-text-muted)]">@{post.author_username}</span>
                <span className="text-[var(--color-text-dim)] text-[11px]">·</span>
                <span className="text-[11px] text-[var(--color-text-dim)]">
                  {new Date(post.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Title ─── */}
          {post.title && (
            <Link href={`/post/${post.id}`} className="block mb-1.5">
              <h3 className={`font-bold text-[var(--color-text)] leading-snug hover:text-[var(--color-accent)] transition-colors ${isReply ? "text-sm" : "text-[15px]"}`}>
                {post.title}
              </h3>
            </Link>
          )}

          {/* ─── Body ─── */}
          {post.body && (
            <Link href={`/post/${post.id}`} className="block mb-3">
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                {post.body.length > 300 ? `${post.body.slice(0, 300)}…` : post.body}
              </p>
            </Link>
          )}

          {/* ─── Image ─── */}
          {post.image_url && !imgError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 rounded-xl overflow-hidden border border-[var(--color-line)] cursor-pointer"
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
          <div className="flex items-center gap-0.5 -mx-1 pt-2 border-t border-[var(--color-line)]/50">
            <VoteButtons
              postId={post.id}
              likeCount={post.like_count}
              user={user}
              onLike={onLike}
            />

            <div className="w-px h-4 bg-[var(--color-line)] mx-1 shrink-0" />

            <button
              onClick={handleReply}
              className="post-action-btn"
              title="Reply"
            >
              <MessageCircle size={14} />
              {post.reply_count > 0 && <span className="text-[11px]">{post.reply_count}</span>}
            </button>

            <button
              onClick={() => onBookmark(post.id)}
              className={`post-action-btn ${isBookmarked ? "active" : ""}`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => onShare(post)}
              className={`post-action-btn ${isCopied ? "active" : ""}`}
              title="Share"
            >
              <Share2 size={14} />
              {isCopied && <span className="text-[9px] font-bold">Copied!</span>}
            </button>

            <Link
              href={`/post/${post.id}`}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--color-panel-2)]"
            >
              Open <ArrowUpRight size={12} />
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
