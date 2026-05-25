"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function ThreadDrawer() {
  const selectedPost = useSimulationStore((s) => s.selectedPost);
  const replies = useSimulationStore((s) => s.threadReplies);
  const closeThread = useSimulationStore((s) => s.closeThread);
  const post = useSimulationStore((s) => s.post);
  const user = useSimulationStore((s) => s.user);
  const [body, setBody] = useState("");

  if (!selectedPost) return null;

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    await post(body.trim());
    setBody("");
  }

  return (
    <aside className="panel-drawer border-l border-[var(--line)]">
      <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-4">
        <div className="flex items-center gap-2 font-semibold"><MessageCircle size={16} /> Thread</div>
        <button onClick={closeThread} className="icon-button grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]" title="Close">
          <X size={16} />
        </button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-auto p-4">
        <article className="rounded border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="font-semibold">@{selectedPost.author_username}</div>
          <p className="mt-3 text-sm leading-6">{selectedPost.body}</p>
        </article>
        <div className="mt-4 space-y-3">
          {replies.length === 0 && <div className="text-sm text-[var(--muted)]">No replies yet. Disturb the timeline.</div>}
          {replies.map((reply) => (
            <article key={reply.id} className="rounded border border-[var(--line)] bg-[#0c0d0a] p-3">
              <div className="text-sm font-semibold">@{reply.author_username}</div>
              <p className="mt-2 text-sm leading-5 text-[#ebe9df]">{reply.body}</p>
            </article>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="border-t border-[var(--line)] p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={!user}
          rows={3}
          placeholder={user ? "Reply to this thread..." : "Login to reply"}
          className="w-full resize-none rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button disabled={!user || !body.trim()} className="button-pop mt-2 flex h-9 items-center gap-2 rounded bg-[var(--accent)] px-3 text-sm font-semibold text-black disabled:opacity-40">
          <Send size={15} /> Reply
        </button>
      </form>
    </aside>
  );
}

