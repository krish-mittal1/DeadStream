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
    <form onSubmit={submit} className="mx-auto w-full max-w-[1060px] border-b border-[var(--color-line)] bg-[var(--color-panel)]">
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
                className="btn-icon mt-0.5 shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-3 py-3 sm:px-6">
        <div className="flex gap-2 sm:gap-3">
          {user && (
            <div className="avatar avatar-lg hidden sm:flex bg-gradient-to-br from-orange-400 to-red-500 shadow-sm">
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
                className="input-premium pl-8 py-2 text-xs sm:text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
              className="input-premium resize-none p-3 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="mt-3 input-premium flex items-center gap-2 px-3 py-2.5">
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
                    className="btn-icon w-5 h-5 shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {imageUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)]"
                >
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </motion.div>
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
            {/* ─── Character Ring Counter ─── */}
            <div className="relative flex items-center justify-center">
              <svg
                width="28"
                height="28"
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke="var(--color-line)"
                  strokeWidth="2.5"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke={isAtLimit ? "var(--color-red)" : isNearLimit ? "var(--color-gold)" : "var(--color-accent)"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 11}
                  initial={false}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 11 * (1 - charCount / maxChars),
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="transition-colors duration-300"
                />
              </svg>
              <span
                className={`absolute text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                  isAtLimit
                    ? "text-[var(--color-red)]"
                    : isNearLimit
                      ? "text-[var(--color-gold)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {charCount > 999 ? "1k+" : charCount}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={!user || busy || (!body.trim() && !title.trim()) || isAtLimit}
              className="btn-primary"
            >
              {busy ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={15} />
                </motion.div>
              ) : (
                <Send size={15} />
              )}
              {selectedPost ? "Reply" : "Post"}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 text-xs text-[var(--color-red)] font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
