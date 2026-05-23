"use client";

import { Heart, MessageCircle, Repeat2, UserPlus } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Feed() {
  const posts = useSimulationStore((s) => s.posts);
  const like = useSimulationStore((s) => s.like);
  const follow = useSimulationStore((s) => s.follow);
  const selectPost = useSimulationStore((s) => s.selectPost);
  const user = useSimulationStore((s) => s.user);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-[var(--muted)]">
          <div className="signal-dot" style={{ width: 16, height: 16 }} />
          <p className="text-sm">Awaiting signal from the simulation...</p>
        </div>
      )}
      {posts.map((post, index) => (
        <article
          key={post.id}
          className={`feed-card border-b border-[var(--line)] p-4 hover:bg-[#10120d] ${post.parent_id ? "pl-8 border-l-2 border-l-[var(--line)]" : ""}`}
          style={{ "--delay": `${Math.min(index, 12) * 45}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="signal-dot shrink-0" />
                <span className="font-semibold truncate">@{post.author_username}</span>
                {post.parent_id && (
                  <span className="shrink-0 text-xs text-[var(--blue)] opacity-70">↳ reply</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                {new Date(post.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="score-chip shrink-0 rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--accent)]">
              {post.score.toFixed(2)}
            </div>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#ebe9df]">{post.body}</p>

          <div className="mt-3 flex items-center gap-1 text-[var(--muted)]">
            <button
              onClick={() => selectPost(post)}
              className="icon-button flex h-8 items-center gap-1.5 rounded px-2 hover:bg-[var(--panel-2)] text-xs"
              title="Reply"
            >
              <MessageCircle size={14} />
              {post.reply_count > 0 && <span>{post.reply_count}</span>}
            </button>
            <button
              onClick={() => like(post.id).catch(() => {})}
              className={`icon-button flex h-8 items-center gap-1.5 rounded px-2 hover:bg-[var(--panel-2)] text-xs ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
              title={user ? "Like" : "Login to like"}
              disabled={!user}
            >
              <Heart size={14} />
              {post.like_count > 0 && <span>{post.like_count}</span>}
            </button>
            <button
              className="icon-button grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]"
              title="Repost (coming soon)"
            >
              <Repeat2 size={14} />
            </button>
            <button
              onClick={() => follow(post.author_id).catch(() => {})}
              className={`icon-button grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)] ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
              title={user ? `Follow @${post.author_username}` : "Login to follow"}
              disabled={!user}
            >
              <UserPlus size={14} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
