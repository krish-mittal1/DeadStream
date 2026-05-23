"use client";

import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Feed() {
  const posts = useSimulationStore((s) => s.posts);

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
      {posts.map((post) => (
        <article key={post.id} className="border-b border-[var(--line)] p-4 hover:bg-[#10120d]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">@{post.author_username}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{new Date(post.created_at).toLocaleString()}</div>
            </div>
            <div className="rounded border border-[var(--line)] px-2 py-1 text-xs text-[var(--accent)]">{post.score.toFixed(2)}</div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#ebe9df]">{post.body}</p>
          <div className="mt-4 flex gap-2 text-[var(--muted)]">
            <button className="grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]" title="Reply"><MessageCircle size={15} /></button>
            <button className="grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]" title="Like"><Heart size={15} /></button>
            <button className="grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]" title="Repost"><Repeat2 size={15} /></button>
          </div>
        </article>
      ))}
    </div>
  );
}

