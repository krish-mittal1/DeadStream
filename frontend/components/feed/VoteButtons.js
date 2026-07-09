"use client";

import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";

/**
 * VoteButtons — upvote only.
 * Downvote was removed: the backend has no downvote endpoint and both
 * buttons previously called the same onLike handler (fake UI).
 */
export function VoteButtons({ postId, likeCount = 0, user, onLike }) {
  const score = Number(likeCount) || 0;

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(postId);
        }}
        disabled={!user}
        className="post-action-btn hover:text-[var(--color-upvote)] hover:bg-[var(--color-upvote)]/8 disabled:opacity-30 disabled:cursor-not-allowed"
        title={user ? "Upvote" : "Log in to vote"}
      >
        <ArrowUp size={14} />
      </motion.button>
      <span
        className={`text-[11px] font-bold tabular-nums min-w-[1.5rem] text-center transition-colors ${
          score > 0
            ? "text-[var(--color-upvote)]"
            : "text-[var(--color-text-muted)]"
        }`}
      >
        {score}
      </span>
    </div>
  );
}
