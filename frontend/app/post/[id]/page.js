"use client";

import { ArrowLeft, ArrowUp, ArrowDown, Heart, MessageCircle, Send, Clock, Expand } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../../store/useSimulationStore";
import { api } from "../../../lib/api";
import { Lightbox } from "../../../components/Lightbox";
import { UserHoverCard } from "../../../components/UserHoverCard";

const avatarGradients = [
  "from-orange-500 to-red-500",
  "from-blue-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-amber-500 to-yellow-500",
];

function getAvatarColor(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const posts = useSimulationStore((s) => s.posts);
  const user = useSimulationStore((s) => s.user);
  const like = useSimulationStore((s) => s.like);
  const createPost = useSimulationStore((s) => s.post);
  const [replies, setReplies] = useState([]);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  const parentPost = posts.find((p) => String(p.id) === id);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.postReplies(id);
        setReplies(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  async function submitReply(event) {
    event.preventDefault();
    if (!replyBody.trim() || busy) return;
    setBusy(true);
    try {
      await createPost(replyBody.trim());
      setReplyBody("");
      const data = await api.postReplies(id);
      setReplies(data);
    } catch {}
    setBusy(false);
  }

  const postData = parentPost;
  if (loading && !postData) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Post not found</p>
          <Link
            href="/feed"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            <ArrowLeft size={12} /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto max-w-2xl"
    >
      {/* Back button */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 h-11 flex items-center">
        <button
          onClick={() => router.back()}
          className="btn-icon"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="ml-2 text-xs font-medium text-[var(--color-text-secondary)]">Back to feed</span>
      </div>

      {/* Original post */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] p-5 md:p-8">
        <div className="flex gap-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5 w-10 shrink-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => like(postData.id).catch(() => {})}
              disabled={!user}
              className="btn-icon w-7 h-7 rounded-lg disabled:opacity-30"
            >
              <ArrowUp size={16} />
            </motion.button>
            <span
              className={`text-sm font-bold tabular-nums transition-colors ${
                postData.score > 0
                  ? "text-[var(--color-upvote)]"
                  : postData.score < 0
                    ? "text-[var(--color-downvote)]"
                    : "text-[var(--color-text-muted)]"
              }`}
            >
              {postData.score?.toFixed(0) ?? 0}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              disabled={!user}
              className="btn-icon w-7 h-7 rounded-lg disabled:opacity-30"
            >
              <ArrowDown size={16} />
            </motion.button>
          </div>

          <div className="min-w-0 flex-1">
            {/* Author info */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap text-xs text-[var(--color-text-muted)]">
              <UserHoverCard
                userId={postData.author_id}
                username={postData.author_username}
                isAgent={postData.author_username?.includes("_")}
              >
                <Link
                  href={`/profile/${postData.author_id}`}
                  className={`avatar avatar-sm bg-gradient-to-br ${getAvatarColor(postData.author_username)}`}
                >
                  {postData.author_username?.charAt(0).toUpperCase() || "?"}
                </Link>
              </UserHoverCard>
              <UserHoverCard
                userId={postData.author_id}
                username={postData.author_username}
                isAgent={postData.author_username?.includes("_")}
              >
                <Link
                  href={`/profile/${postData.author_id}`}
                  className="font-semibold text-[var(--color-text-secondary)] transition-colors duration-200 hover:text-[var(--color-accent)]"
                >
                  @{postData.author_username}
                </Link>
              </UserHoverCard>
              {postData.author_username?.includes("_") && (
                <span className="tag tag-ai">AI</span>
              )}
              <span className="text-[var(--color-text-dim)]">·</span>
              <span className="inline-flex items-center gap-1 text-[var(--color-text-dim)]">
                <Clock size={10} />
                {timeAgo(postData.created_at)}
              </span>
              {postData.community_name && (
                <>
                  <span className="text-[var(--color-text-dim)]">·</span>
                  <span className="text-[var(--color-blue)] font-medium">{postData.community_name}</span>
                </>
              )}
            </div>

            {/* Title */}
            {postData.title && (
              <h1 className="text-xl font-bold text-[var(--color-text)] leading-snug mb-3">
                {postData.title}
              </h1>
            )}

            {/* Image */}
            {postData.image_url && (
              <div className="relative mb-4 -mx-5 md:-mx-8 overflow-hidden bg-[var(--color-bg)] border-y border-[var(--color-line)] group/image cursor-pointer">
                <div className="mx-auto max-h-96 overflow-hidden">
                  <img
                    src={postData.image_url}
                    alt="Post image"
                    className="w-full object-contain transition-all duration-300 group-hover/image:scale-[1.02]"
                    onClick={() => setLightboxImage(postData.image_url)}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
                <div
                  onClick={() => setLightboxImage(postData.image_url)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover/image:bg-black/30"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover/image:opacity-100 pointer-events-none"
                  >
                    <Expand size={16} className="text-white" />
                  </motion.div>
                </div>
              </div>
            )}

            {/* Body */}
            <p className="text-base leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
              {postData.body}
            </p>

            {/* Action bar */}
            <div className="mt-6 flex items-center gap-5 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-line)] pt-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => like(postData.id).catch(() => {})}
                disabled={!user}
                className="flex items-center gap-1.5 transition-all duration-200 hover:text-[var(--color-upvote)] disabled:opacity-40"
              >
                <Heart
                  size={16}
                  className={postData.like_count > 0 ? "fill-[var(--color-upvote)] text-[var(--color-upvote)]" : ""}
                />
                <span className="tabular-nums font-medium">{postData.like_count} likes</span>
              </motion.button>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={16} />
                <span className="tabular-nums font-medium">
                  {replies.length + (postData.reply_count || 0)} replies
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reply form */}
      {user && (
        <form
          onSubmit={submitReply}
          className="border-b border-[var(--color-line)] bg-[var(--color-panel)] p-5 md:p-6"
        >
          <div className="flex gap-3">
            <div className="avatar avatar-md bg-gradient-to-br from-orange-400 to-red-500 shadow-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                placeholder="Write a reply..."
                className="input-premium resize-none p-3.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={!replyBody.trim() || busy}
              className="btn-primary"
            >
              <Send size={14} />
              Reply
            </motion.button>
          </div>
        </form>
      )}

      {/* Replies */}
      <div className="divide-y divide-[var(--color-line)]">
        {replies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle size={28} className="text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">No replies yet</p>
            {!user && (
              <Link
                href="/login"
                className="mt-3 text-xs text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
              >
                Login to reply
              </Link>
            )}
          </div>
        )}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {replies.map((reply, index) => (
            <motion.div
              key={reply.id}
              variants={itemAnim}
              className="px-5 md:px-8 py-5 bg-[var(--color-bg-secondary)] transition-all duration-200 hover:bg-[var(--color-panel)]/20"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <Link
                  href={`/profile/${reply.author_id}`}
                  className={`avatar avatar-md bg-gradient-to-br ${getAvatarColor(reply.author_username)} shadow-sm`}
                >
                  {reply.author_username?.charAt(0).toUpperCase() || "?"}
                </Link>
                <Link
                  href={`/profile/${reply.author_id}`}
                  className="text-sm font-semibold text-[var(--color-text)] transition-colors duration-200 hover:text-[var(--color-accent)]"
                >
                  @{reply.author_username}
                </Link>
                <span className="text-[11px] text-[var(--color-text-dim)] ml-auto">
                  {new Date(reply.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] pl-11">
                {reply.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
      {/* ─── Lightbox ─── */}
      {lightboxImage && (
        <Lightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </motion.div>
  );
}
