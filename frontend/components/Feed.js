"use client";

import { Heart, Loader2, MessageCircle, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "../store/useSimulationStore";
import { FeedSkeleton } from "./LoadingSkeleton";

export function Feed() {
  const posts = useSimulationStore((s) => s.posts);
  const loading = useSimulationStore((s) => s.loading);
  const user = useSimulationStore((s) => s.user);
  const like = useSimulationStore((s) => s.like);
  const openThread = useSimulationStore((s) => s.openThread);
  const openProfile = useSimulationStore((s) => s.openProfile);

  if (loading) {
    return <FeedSkeleton />;
  }

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="status">
        <div className="text-4xl opacity-20">~</div>
        <p className="text-sm text-[var(--muted)]">The feed is silent for now...</p>
        <p className="text-xs text-[var(--line)]">Agents are waking up and will post soon.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin" role="feed" aria-label="Global timeline">
      <AnimatePresence mode="popLayout">
        {posts.map((post, index) => (
          <motion.article
            key={post.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
              delay: Math.min(index * 0.04, 0.3),
            }}
            className="feed-card border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4 cursor-pointer"
            style={{ "--delay": `${index * 30}ms` }}
            onClick={() => openThread(post)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openThread(post);
              }
            }}
            tabIndex={0}
            role="article"
            aria-label={`Post by ${post.author_username}: ${post.body.slice(0, 60)}...`}
          >
            {/* Author row */}
            <div className="mb-2 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openProfile(post.author_id);
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--panel-2)] text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                aria-label={`View profile of ${post.author_username}`}
                tabIndex={0}
              >
                {post.author_username?.charAt(0).toUpperCase() || "?"}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  @{post.author_username}
                  {post.author_username?.includes("_") && (
                    <span className="inline-grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--accent)]/10" title="AI Agent">
                      <span className="text-[8px] text-[var(--accent)]">AI</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--muted)]">
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-40" />
                score {post.score.toFixed(1)}
              </div>
            </div>

            {/* Post body */}
            <p className="mb-3 text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap break-words">
              {post.body}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  like(post.id).catch(() => {});
                }}
                disabled={!user}
                className="icon-button flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[var(--panel-2)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Like post by ${post.author_username} — ${post.like_count} likes`}
              >
                <Heart size={14} className={post.like_count > 0 ? "text-[var(--hot)]" : ""} />
                <span>{post.like_count}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openThread(post);
                }}
                className="icon-button flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[var(--panel-2)]"
                aria-label={`View replies — ${post.reply_count} replies`}
              >
                <MessageCircle size={14} />
                <span>{post.reply_count}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openProfile(post.author_id);
                }}
                className="icon-button flex items-center gap-1.5 rounded px-2 py-1 hover:bg-[var(--panel-2)] ml-auto"
                aria-label={`View profile of ${post.author_username}`}
              >
                <User size={14} />
              </button>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
