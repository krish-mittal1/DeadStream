"use client";

import { Image, Link2, Loader2, Send, Sparkles, X, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Composer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focusedTitle, setFocusedTitle] = useState(false);
  const [focusedBody, setFocusedBody] = useState(false);
  const titleRef = useRef(null);
  const user = useSimulationStore((s) => s.user);
  const post = useSimulationStore((s) => s.post);
  const selectedPost = useSimulationStore((s) => s.selectedPost);
  const clearSelectedPost = useSimulationStore((s) => s.clearSelectedPost);

  const charCount = body.length;
  const maxChars = 1200;
  const isNearLimit = charCount > maxChars * 0.85;
  const isAtLimit = charCount >= maxChars;

  // Focus title input on mount
  useEffect(() => {
    if (user) titleRef.current?.focus();
  }, [user]);

  async function submit(event) {
    event.preventDefault();
    if ((!title.trim() && !body.trim()) || busy) return;
    setError("");
    setBusy(true);
    try {
      await post(body.trim() || null, imageUrl.trim() || null, title.trim() || null);
      setTitle("");
      setBody("");
      setImageUrl("");
      setShowImageInput(false);
    } catch (err) {
      setError(
        err.message?.includes("login_required")
          ? "Login to post."
          : "Post failed. Try again."
      );
    } finally {
      setBusy(false);
      titleRef.current?.focus();
    }
  }

  return (
    <form onSubmit={submit} className="border-b border-[var(--color-line)] bg-[var(--color-panel)]">
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-[var(--color-blue)]/20 bg-[var(--color-blue)]/[0.04] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-blue)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-blue)]" />
                  Replying to @{selectedPost.author_username}
                </div>
                {selectedPost.title && (
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text)] truncate">
                    {selectedPost.title}
                  </div>
                )}
                <div className="mt-0.5 line-clamp-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {selectedPost.body}
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedPost}
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel-2)] hover:text-white"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-4 md:px-6">
        {/* Avatar + Inputs */}
        <div className="flex gap-3">
          {user && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white shadow-sm">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title input */}
            <div className="relative">
              <Type size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setFocusedTitle(true)}
                onBlur={() => setFocusedTitle(false)}
                maxLength={300}
                disabled={!user}
                placeholder={
                  !user
                    ? ""
                    : selectedPost
                      ? "Reply title... (optional)"
                      : "Post a title..."
                }
                className={`w-full rounded-xl border bg-[var(--color-bg)] pl-8 pr-3 py-2.5 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] placeholder:font-normal disabled:cursor-not-allowed disabled:opacity-40 ${
                  focusedTitle
                    ? "border-[var(--color-accent)] shadow-[0_0_0_1px_var(--color-accent)]"
                    : "border-[var(--color-line)] hover:border-[var(--color-line-light)]"
                }`}
              />
            </div>
            {/* Body textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !busy)
                  submit(e);
              }}
              onFocus={() => setFocusedBody(true)}
              onBlur={() => setFocusedBody(false)}
              rows={3}
              maxLength={maxChars}
              disabled={!user}
              placeholder={
                !user
                  ? "Login to post something..."
                  : selectedPost
                    ? "Add fuel, empathy, or confusion..."
                    : "Write something detailed... (optional if title provided)"
              }
              className={`w-full resize-none rounded-xl border bg-[var(--color-bg)] p-3.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-40 ${
                focusedBody
                  ? "border-[var(--color-accent)] shadow-[0_0_0_1px_var(--color-accent)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-line-light)]"
              }`}
            />
          </div>
        </div>

        {/* Image URL input */}
        <AnimatePresence>
          {showImageInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2.5 transition-all focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent)]">
                <Link2 size={14} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL... (optional)"
                  className="flex-1 bg-transparent text-xs outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {imageUrl && (
                <div className="mt-2 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)]">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <Sparkles size={12} />
              <span className="truncate">
                {user ? `Posting as @${user.username}` : "Observer mode"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                showImageInput
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)]"
              }`}
            >
              <Image size={13} />
              Image
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs tabular-nums transition-colors duration-200 ${
                isNearLimit ? "text-[var(--color-red)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              {charCount}/{maxChars}
            </span>
            <button
              type="submit"
              disabled={!user || busy || (!body.trim() && !title.trim()) || isAtLimit}
              className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97]"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {selectedPost ? "Reply" : "Post"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 text-xs text-[var(--color-red)]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
