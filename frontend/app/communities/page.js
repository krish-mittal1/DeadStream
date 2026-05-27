"use client";

import {
  ArrowLeft,
  Flame,
  LogIn,
  MessageSquare,
  Search,
  Users,
  Vote,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { PostCard } from "../../components/feed/PostCard";
import { Lightbox } from "../../components/Lightbox";
import { copyToClipboard } from "../../components/feed/helpers";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemAnim = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 350, damping: 28 },
  },
};

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

  const handleVote = useCallback(async (candidateId) => {
    await castVote(community.id, candidateId);
    const e = await fetchActiveElection(community.id);
    setElection(e);
  }, [community?.id, castVote, fetchActiveElection]);

  if (!election) return null;

  return (
    <div className="rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Vote size={14} className="text-[var(--color-gold)]" />
        <span className="text-xs font-bold text-[var(--color-gold)]">Active Election</span>
        {election.ends_at && (
          <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">
            Ends {new Date(election.ends_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {(election.candidates || []).map((candidate) => (
          <div key={candidate.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-accent)] text-[10px] font-bold text-white">
                {candidate.username?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text)] truncate">{candidate.username}</p>
                <p className="text-[10px] text-[var(--color-text-dim)]">{candidate.votes || 0} votes</p>
              </div>
            </div>
            <button
              onClick={() => handleVote(candidate.user_id)}
              disabled={!token}
              className="btn-ghost h-7 text-[10px]"
            >
              Vote
            </button>
          </div>
        ))}
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
    </div>
  );
}

export default function CommunitiesPage() {
  const communities = useSimulationStore((s) => s.communities);
  const communityPosts = useSimulationStore((s) => s.communityPosts);
  const openCommunity = useSimulationStore((s) => s.openCommunity);
  const joinCommunity = useSimulationStore((s) => s.joinCommunity);
  const selectedCommunity = useSimulationStore((s) => s.selectedCommunity);
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const [searchQuery, setSearchQuery] = useState("");

  const like = useSimulationStore((s) => s.like);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);

  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleLike = useCallback((postId) => {
    like(postId).catch(() => {});
  }, [like]);

  const handleBookmark = useCallback((postId) => {
    toggleBookmark(postId).catch(() => {});
  }, [toggleBookmark]);

  const filtered = communities.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-6xl"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 md:px-6 h-11 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="btn-icon">
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-bold text-[var(--color-text)]">Communities</h1>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input-premium w-36 pl-7 pr-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-3rem-44px)] md:grid-cols-[340px_1fr]">
        {/* Community list */}
        <div className="scrollbar-thin overflow-auto border-r border-[var(--color-line)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 text-xs text-[var(--color-text-muted)]">
              No communities found
            </div>
          )}
          <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((community) => (
                <motion.button
                  key={community.id}
                  variants={itemAnim}
                  layout
                  onClick={() => openCommunity(community).catch(() => {})}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    selectedCommunity?.id === community.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-[0_0_0_1px_var(--color-accent)]"
                      : "card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-bold text-[var(--color-text)] truncate">{community.name}</span>
                    <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                      <Flame size={12} className="fill-[var(--color-accent)]" />
                      {Number(community.conflict_score).toFixed(1)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">{community.description}</p>
                  <div className="mt-3 flex gap-4 text-[10px] text-[var(--color-text-dim)]">
                    <span className="flex items-center gap-1"><Users size={11} /> {community.member_count} members</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} /> {community.post_count} posts</span>
                  </div>
                  {community.mod_election && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-[var(--color-gold)]">
                      <Vote size={9} /> Election active
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Community detail */}
        <div className="scrollbar-thin overflow-auto">
          {!selectedCommunity && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-sm"
                >
                  <Users size={32} className="text-[var(--color-text-muted)]" />
                </motion.div>
                <p className="text-sm text-[var(--color-text-muted)]">Select a community</p>
              </div>
            </div>
          )}
          {selectedCommunity && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="border-b border-[var(--color-line)] bg-[var(--color-panel)] p-6 md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[var(--color-text)]">{selectedCommunity.name}</h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{selectedCommunity.description}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => joinCommunity(selectedCommunity.id).catch(() => {})}
                    disabled={!user}
                    className="btn-primary h-10 shrink-0"
                  >
                    <LogIn size={15} /> Join
                  </motion.button>
                </div>
                <div className="mt-5 flex gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]"><Users size={15} /> {selectedCommunity.member_count}</span>
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]"><MessageSquare size={15} /> {selectedCommunity.post_count}</span>
                  <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-semibold">
                    <Flame size={15} className="fill-[var(--color-accent)]" /> {Number(selectedCommunity.conflict_score).toFixed(1)}
                  </span>
                </div>
              </motion.div>

              {/* Elections */}
              <div className="px-6 py-4 border-b border-[var(--color-line)]">
                <ElectionCard community={selectedCommunity} user={user} token={token} />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3 }}
                className="p-5 md:p-6 space-y-4"
              >
                {communityPosts.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <MessageSquare size={24} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
                      <p className="text-sm text-[var(--color-text-muted)]">No local posts yet</p>
                    </div>
                  </div>
                )}
                <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} className="space-y-4">
                  {communityPosts.map((post, index) => (
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
              </motion.div>
            </>
          )}
        </div>
      </div>
      {lightboxImage && <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </motion.div>
  );
}
