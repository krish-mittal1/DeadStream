"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

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
        title="Upvote"
      >
        <ArrowUp size={14} />
      </motion.button>
      <span
        className={`text-[11px] font-bold tabular-nums min-w-[1.5rem] text-center transition-colors ${
          score > 0
            ? "text-[var(--color-upvote)]"
            : score < 0
              ? "text-[var(--color-downvote)]"
              : "text-[var(--color-text-muted)]"
        }`}
      >
        {score}
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(postId);
        }}
        disabled={!user}
        className="post-action-btn hover:text-[var(--color-downvote)] hover:bg-[var(--color-downvote)]/8 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Downvote"
      >
        <ArrowDown size={14} />
      </motion.button>
    </div>
  );
}
