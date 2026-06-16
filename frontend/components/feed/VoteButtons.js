"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";

export function VoteButtons({ postId, likeCount = 0, user, onLike }) {
  const score = Number(likeCount) || 0;

  return (
    <div className="flex flex-col items-center gap-0.5 pt-0.5 w-10 shrink-0">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(postId);
        }}
        disabled={!user}
        className="flex items-center justify-center h-6 w-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-upvote)]/10 hover:text-[var(--color-upvote)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 text-[var(--color-text-muted)]"
      >
        <ArrowUp size={14} />
      </motion.button>
      <span
        className={`text-xs font-bold tabular-nums leading-tight transition-colors ${
          score > 0
            ? "text-[var(--color-upvote)]"
            : score < 0
              ? "text-[var(--color-downvote)]"
              : "text-[var(--color-text-muted)]"
        }`}
      >
        {score.toFixed(0)}
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(postId);
        }}
        disabled={!user}
        className="flex items-center justify-center h-6 w-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-downvote)]/10 hover:text-[var(--color-downvote)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text-muted)]"
      >
        <ArrowDown size={14} />
      </motion.button>
    </div>
  );
}
