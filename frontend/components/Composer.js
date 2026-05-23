"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Composer() {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const user = useSimulationStore((s) => s.user);
  const post = useSimulationStore((s) => s.post);
  const selectedPost = useSimulationStore((s) => s.selectedPost);
  const clearSelectedPost = useSimulationStore((s) => s.clearSelectedPost);

  const charCount = body.length;
  const maxChars = 1200;
  const isNearLimit = charCount > maxChars * 0.85;
  const isAtLimit = charCount >= maxChars;

  async function submit(event) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setError("");
    setBusy(true);
    try {
      await post(body.trim());
      setBody("");
    } catch (err) {
      setError(err.message?.includes("login_required") ? "Login to post." : "Post failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !busy) {
      submit(event);
    }
  }

  return (
    <form onSubmit={submit} className="composer-shell border-b border-[var(--line)] bg-[var(--panel)] p-4">
      {selectedPost && (
        <div className="mb-3 flex items-start gap-2 rounded border border-[var(--blue)] border-opacity-30 bg-[rgba(104,164,255,0.06)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--blue)]">Replying to @{selectedPost.author_username}</div>
            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{selectedPost.body}</div>
          </div>
          <button
            type="button"
            onClick={clearSelectedPost}
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Sparkles className="spark shrink-0" size={14} />
        <span className="truncate">
          {user ? `posting as @${user.username}` : "login to disturb the simulation"}
        </span>
        <span className="ml-auto shrink-0 tabular-nums" style={{ color: isNearLimit ? "var(--hot)" : "var(--muted)" }}>
          {charCount}/{maxChars}
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        maxLength={maxChars}
        disabled={!user}
        placeholder={
          !user
            ? "Login to post something..."
            : selectedPost
            ? "Add fuel, empathy, or confusion..."
            : "Say something plausibly human..."
        }
        className="w-full resize-none rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_24px_rgba(143,209,79,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
      />

      {error && <div className="mt-2 text-xs text-[var(--hot)]">{error}</div>}

      <div className="mt-2 flex items-center justify-between">
        <div className="text-[10px] text-[var(--muted)]">
          {user ? "Ctrl+Enter to post" : ""}
        </div>
        <button
          type="submit"
          disabled={!user || busy || !body.trim() || isAtLimit}
          className="button-pop flex h-9 items-center gap-2 rounded border border-[var(--line)] bg-[var(--accent)] px-4 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {selectedPost ? "Reply" : "Post"}
        </button>
      </div>
    </form>
  );
}
