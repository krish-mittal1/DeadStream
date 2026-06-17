"use client";

import {
  ArrowLeft,
  Flame,
  LogIn,
  MessageSquare,
  Users,
  Zap,
  Crown,
  Vote,
  Shield,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSimulationStore } from "../../../store/useSimulationStore";
import { api } from "../../../lib/api";
import { PostCard } from "../../../components/feed/PostCard";
import { Lightbox } from "../../../components/Lightbox";
import { copyToClipboard } from "../../../components/feed/helpers";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const COMMUNITY_GRADIENTS = [
  ["#ff4500", "#ff6534"],
  ["#4f8cff", "#9b6cff"],
  ["#10d48e", "#14b8a6"],
  ["#fb4785", "#f5a623"],
  ["#9b6cff", "#4f8cff"],
  ["#f5a623", "#ff4500"],
  ["#22d3ee", "#4f8cff"],
  ["#2ecc71", "#10d48e"],
  ["#ff6b6b", "#ee5a24"],
  ["#a29bfe", "#6c5ce7"],
  ["#fd79a8", "#e84393"],
  ["#00b894", "#00cec9"],
];

function getCommunityGradient(name) {
  const hash = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pair = COMMUNITY_GRADIENTS[hash % COMMUNITY_GRADIENTS.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

function getCommunityInitials(name) {
  return (
    (name || "?")
      .split(/[\s_-]/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ||
    name[0]?.toUpperCase() ||
    "?"
  );
}

function ConflictBar({ score }) {
  const pct = Math.min(100, Math.round(score * 100));
  const color =
    pct > 70
      ? "var(--color-red)"
      : pct > 40
      ? "var(--color-accent)"
      : "var(--color-green)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function CommunityIcon({ name, size = 40 }) {
  const gradient = getCommunityGradient(name);
  const initials = getCommunityInitials(name);
  const fontSize = size < 36 ? "11px" : size < 52 ? "14px" : "18px";
  return (
    <div
      className="shrink-0 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ring-4 ring-[var(--color-bg)]"
      style={{ width: size, height: size, background: gradient, fontSize }}
    >
      {initials}
    </div>
  );
}

function ElectionCard({ community, user, token }) {
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchActiveElection = useSimulationStore((s) => s.fetchActiveElection);
  const startElection = useSimulationStore((s) => s.startElection);
  const castVote = useSimulationStore((s) => s.castVote);

  useEffect(() => {
    if (community?.id) {
      fetchActiveElection(community.id).then(setElection);
    }
  }, [community?.id, fetchActiveElection]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    await startElection(community.id);
    const e = await fetchActiveElection(community.id);
    setElection(e);
    setLoading(false);
  }, [community?.id, startElection, fetchActiveElection]);

  const handleVote = useCallback(
    async (candidateId) => {
      await castVote(community.id, candidateId);
      const e = await fetchActiveElection(community.id);
      setElection(e);
    },
    [community?.id, castVote, fetchActiveElection]
  );

  if (!election) return null;

  const totalVotes = (election.candidates || []).reduce(
    (s, c) => s + (c.votes || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 md:mx-6 my-3 rounded-2xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-gold)]/15">
          <Vote size={12} className="text-[var(--color-gold)]" />
        </div>
        <span className="text-xs font-bold text-[var(--color-gold)]">
          Community Election
        </span>
        {election.ends_at && (
          <span className="text-[10px] text-[var(--color-text-dim)] ml-auto border border-[var(--color-line)] rounded-full px-2 py-0.5">
            Ends {new Date(election.ends_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {(election.candidates || []).map((candidate) => {
          const pct =
            totalVotes > 0
              ? Math.round(((candidate.votes || 0) / totalVotes) * 100)
              : 0;
          return (
            <div key={candidate.user_id} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-accent)] text-[9px] font-bold text-white">
                    {candidate.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                    {candidate.username}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-dim)]">
                    {candidate.votes || 0} votes
                  </span>
                </div>
                <button
                  onClick={() => handleVote(candidate.user_id)}
                  disabled={!token}
                  className="btn-ghost h-6 text-[10px] px-2 shrink-0"
                >
                  Vote
                </button>
              </div>
              <div className="h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-accent)]"
                />
              </div>
            </div>
          );
        })}
      </div>
      {!election.started && (
        <button
          onClick={handleStart}
          disabled={loading || !token}
          className="btn-primary h-8 text-xs w-full"
        >
          <Shield size={13} /> {loading ? "Starting..." : "Start Election"}
        </button>
      )}
    </motion.div>
  );
}

export default function CommunityPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const joinCommunity = useSimulationStore((s) => s.joinCommunity);
  const like = useSimulationStore((s) => s.like);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);
  const storedCommunities = useSimulationStore((s) => s.communities);

  const [community, setCommunity] = useState(
    () => storedCommunities.find((c) => c.id === id) || null
  );
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!id) return;
    api.communityDetail(id).then(setCommunity).catch(() => {});
    setPostsLoading(true);
    api
      .communityFeed(id)
      .then((p) => {
        setPosts(p || []);
        setPostsLoading(false);
      })
      .catch(() => setPostsLoading(false));
  }, [id]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      await joinCommunity(id);
    } catch {}
    setJoining(false);
  }, [id, joinCommunity]);

  const handleLike = useCallback(
    (postId) => {
      like(postId).catch(() => {});
    },
    [like]
  );
  const handleBookmark = useCallback(
    (postId) => {
      toggleBookmark(postId).catch(() => {});
    },
    [toggleBookmark]
  );
  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const gradient = community
    ? getCommunityGradient(community.name)
    : "linear-gradient(135deg, #ff4500, #ff6534)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ─── Sticky header bar ─── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl px-4 h-11 shrink-0">
        <button onClick={() => router.back()} className="btn-icon shrink-0">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-sm font-bold text-[var(--color-text)] truncate">
          {community?.name || "Community"}
        </h1>
        {community && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--color-text-dim)] bg-[var(--color-panel)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
              <Users size={9} />
              {community.member_count?.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ─── Community banner ─── */}
      <div className="relative overflow-hidden">
        {/* Gradient wash */}
        <div
          className="absolute inset-0"
          style={{ background: gradient, opacity: 0.13 }}
        />
        {/* Bottom fade to bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20"
          style={{
            background:
              "linear-gradient(to top, var(--color-bg), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative px-5 pt-8 pb-7 md:px-8 md:pt-10"
        >
          {/* Icon + name/desc */}
          <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
            <CommunityIcon name={community?.name || "?"} size={68} />
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[22px] font-extrabold text-[var(--color-text)] leading-tight">
                  {community?.name || "Loading…"}
                </h2>
                {community?.conflict_score > 0.7 && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-red)] bg-[var(--color-red)]/10 px-2 py-0.5 rounded-full">
                    <Zap size={8} /> HIGH TENSION
                  </span>
                )}
                {community?.mod_election && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2 py-0.5 rounded-full">
                    <Crown size={8} /> ELECTION
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
                {community?.description}
              </p>

              {/* Stats */}
              <div className="mt-3 flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                  <Users size={13} />
                  <span className="font-bold">
                    {community?.member_count?.toLocaleString() ?? "—"}
                  </span>
                  <span className="text-[var(--color-text-dim)]">members</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
                  <MessageSquare size={13} />
                  <span className="font-bold">
                    {community?.post_count?.toLocaleString() ?? "—"}
                  </span>
                  <span className="text-[var(--color-text-dim)]">posts</span>
                </div>
                {community?.conflict_score > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] font-semibold">
                    <Flame size={13} className="fill-[var(--color-accent)]" />
                    <span>
                      {Math.round(Number(community.conflict_score) * 100)}%
                      conflict
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conflict bar + Join */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-sm space-y-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
                  Conflict level
                </span>
              </div>
              <ConflictBar score={Number(community?.conflict_score || 0)} />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoin}
              disabled={!user || joining}
              className="btn-primary h-9 px-6 text-sm shrink-0"
            >
              <LogIn size={14} />
              {joining ? "Joining…" : user ? "Join Community" : "Log in to join"}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ─── Election card ─── */}
      {community && <ElectionCard community={community} user={user} token={token} />}

      {/* ─── Posts ─── */}
      <div className="border-t border-[var(--color-line)]">
        {/* Posts header */}
        <div className="px-4 md:px-6 py-3 flex items-center gap-2">
          <Activity size={13} className="text-[var(--color-text-muted)]" />
          <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">
            Community Posts
          </span>
          {posts.length > 0 && (
            <span className="text-[10px] text-[var(--color-text-dim)] bg-[var(--color-panel)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
              {posts.length}
            </span>
          )}
        </div>

        <div className="px-4 md:px-6 pb-10">
          {postsLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          )}
          {!postsLoading && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <MessageSquare
                size={28}
                className="text-[var(--color-text-dim)]"
              />
              <p className="text-sm text-[var(--color-text-muted)]">
                No posts yet in this community
              </p>
              <p className="text-xs text-[var(--color-text-dim)]">
                Be the first to start a conversation
              </p>
            </div>
          )}
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                index={index}
                user={user}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onShare={handleShare}
                copiedId={copiedId}
                bookmarkedIds={bookmarkedIds}
                onImageExpand={setLightboxImage}
              />
            ))}
          </motion.div>
        </div>
      </div>

      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </motion.div>
  );
}
