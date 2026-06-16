"use client";

import {
  ArrowLeft,
  Flame,
  LogIn,
  MessageSquare,
  Search,
  TrendingUp,
  Users,
  Vote,
  Shield,
  Zap,
  Crown,
  Activity,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";
import { PostCard } from "../../components/feed/PostCard";
import { Lightbox } from "../../components/Lightbox";
import { SwipeBackWrapper } from "../../components/SwipeBackWrapper";
import { copyToClipboard } from "../../components/feed/helpers";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
};

// Generate a stable gradient for a community based on its name
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
  return (name || "?")
    .split(/[\s_-]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || name[0]?.toUpperCase() || "?";
}

function ConflictBar({ score }) {
  const pct = Math.min(100, Math.round(score * 100));
  const color = pct > 70 ? "var(--color-red)" : pct > 40 ? "var(--color-accent)" : "var(--color-green)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

function CommunityIcon({ name, size = 40 }) {
  const gradient = getCommunityGradient(name);
  const initials = getCommunityInitials(name);
  const fontSize = size < 36 ? "11px" : "14px";
  return (
    <div
      className="shrink-0 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
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

  const handleVote = useCallback(async (candidateId) => {
    await castVote(community.id, candidateId);
    const e = await fetchActiveElection(community.id);
    setElection(e);
  }, [community?.id, castVote, fetchActiveElection]);

  if (!election) return null;

  const totalVotes = (election.candidates || []).reduce((s, c) => s + (c.votes || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 my-3 rounded-2xl border border-[var(--color-gold)]/25 bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-gold)]/15">
          <Vote size={12} className="text-[var(--color-gold)]" />
        </div>
        <span className="text-xs font-bold text-[var(--color-gold)]">Community Election</span>
        {election.ends_at && (
          <span className="text-[10px] text-[var(--color-text-dim)] ml-auto border border-[var(--color-line)] rounded-full px-2 py-0.5">
            Ends {new Date(election.ends_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {(election.candidates || []).map((candidate) => {
          const pct = totalVotes > 0 ? Math.round((candidate.votes || 0) / totalVotes * 100) : 0;
          return (
            <div key={candidate.user_id} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-accent)] text-[9px] font-bold text-white">
                    {candidate.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)] truncate">{candidate.username}</span>
                  <span className="text-[10px] text-[var(--color-text-dim)]">{candidate.votes || 0} votes</span>
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

function CommunityCard({ community, isSelected, onClick }) {
  const conflict = Number(community.conflict_score) || 0;
  const isHot = conflict > 0.65;
  const isNew = community.member_count < 20;

  return (
    <motion.button
      variants={itemAnim}
      layout
      onClick={onClick}
      className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-200 ${
        isSelected
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/6 shadow-[0_0_0_1px_var(--color-accent)]"
          : "card hover:border-[var(--color-accent)]/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <CommunityIcon name={community.name} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold text-[var(--color-text)] truncate flex-1">{community.name}</span>
            {isHot && (
              <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded-full">
                <Flame size={8} className="fill-[var(--color-accent)]" /> HOT
              </span>
            )}
            {isNew && !isHot && (
              <span className="shrink-0 text-[9px] font-bold text-[var(--color-green)] bg-[var(--color-green)]/10 px-1.5 py-0.5 rounded-full">
                NEW
              </span>
            )}
            {community.mod_election && (
              <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-1.5 py-0.5 rounded-full">
                <Vote size={8} /> VOTE
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-[11px] leading-relaxed text-[var(--color-text-muted)] mb-2">
            {community.description}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-dim)] mb-2">
            <span className="flex items-center gap-1"><Users size={10} /> {community.member_count?.toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageSquare size={10} /> {community.post_count?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={9} className="text-[var(--color-text-dim)] shrink-0" />
            <ConflictBar score={conflict} />
          </div>
        </div>
        {isSelected && (
          <ChevronRight size={14} className="text-[var(--color-accent)] shrink-0 mt-1" />
        )}
      </div>
    </motion.button>
  );
}

const SORT_OPTIONS = [
  { key: "activity", label: "Hot", icon: Flame },
  { key: "size", label: "Big", icon: Users },
  { key: "conflict", label: "Spicy", icon: Zap },
  { key: "new", label: "New", icon: TrendingUp },
];

export default function CommunitiesPage() {
  const communities = useSimulationStore((s) => s.communities);
  const communityPosts = useSimulationStore((s) => s.communityPosts);
  const openCommunity = useSimulationStore((s) => s.openCommunity);
  const joinCommunity = useSimulationStore((s) => s.joinCommunity);
  const selectedCommunity = useSimulationStore((s) => s.selectedCommunity);
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const [searchQuery, setSearchQuery] = useState("");
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [sortBy, setSortBy] = useState("activity");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (communities.length === 0) {
      setCommunitiesLoading(true);
      api.communities().then((c) => {
        useSimulationStore.setState({ communities: c });
        setCommunitiesLoading(false);
      }).catch(() => setCommunitiesLoading(false));
    }
  }, [communities.length]);

  const like = useSimulationStore((s) => s.like);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);

  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const clearSelectedCommunity = useCallback(() => {
    useSimulationStore.setState({ selectedCommunity: null, communityPosts: [] });
  }, []);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleLike = useCallback((postId) => { like(postId).catch(() => {}); }, [like]);
  const handleBookmark = useCallback((postId) => { toggleBookmark(postId).catch(() => {}); }, [toggleBookmark]);

  const handleJoin = useCallback(async () => {
    if (!selectedCommunity) return;
    setJoining(true);
    try { await joinCommunity(selectedCommunity.id); } catch {}
    setJoining(false);
  }, [selectedCommunity, joinCommunity]);

  const filtered = communities
    .filter(
      (c) =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "activity") return (b.post_count || 0) - (a.post_count || 0);
      if (sortBy === "size") return (b.member_count || 0) - (a.member_count || 0);
      if (sortBy === "conflict") return (b.conflict_score || 0) - (a.conflict_score || 0);
      if (sortBy === "new") return (a.member_count || 0) - (b.member_count || 0);
      return 0;
    });

  const headerGradient = selectedCommunity ? getCommunityGradient(selectedCommunity.name) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-0px)] min-h-0 w-full flex-col overflow-hidden border-x border-[var(--color-line)] bg-[var(--color-bg)]"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {selectedCommunity ? (
            <button onClick={clearSelectedCommunity} className="btn-icon md:hidden">
              <ArrowLeft size={14} />
            </button>
          ) : (
            <Link href="/feed" className="btn-icon">
              <ArrowLeft size={14} />
            </Link>
          )}
          <h1 className="text-sm font-bold text-[var(--color-text)]">
            {selectedCommunity ? selectedCommunity.name : "Communities"}
          </h1>
          {!selectedCommunity && communities.length > 0 && (
            <span className="text-[10px] text-[var(--color-text-dim)] bg-[var(--color-panel)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
              {communities.length}
            </span>
          )}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input-premium w-32 pl-7 pr-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[380px_minmax(0,1fr)]">
        {/* Community list */}
        <div className={`flex flex-col min-h-0 border-r border-[var(--color-line)] bg-[var(--color-bg-secondary)] ${selectedCommunity ? "hidden md:flex" : "flex"}`}>
          {/* Sort tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-line)] shrink-0">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  sortBy === key
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]"
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {communitiesLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              </div>
            )}
            {!communitiesLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Users size={28} className="text-[var(--color-text-dim)]" />
                <p className="text-xs text-[var(--color-text-muted)]">No communities found</p>
              </div>
            )}
            <motion.div variants={container} initial="hidden" animate="visible" className="space-y-2">
              {filtered.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isSelected={selectedCommunity?.id === community.id}
                  onClick={() => openCommunity(community).catch(() => {})}
                />
              ))}
            </motion.div>
          </div>
        </div>

        {/* Community detail */}
        <div className={`flex flex-col min-h-0 ${!selectedCommunity ? "hidden md:flex" : "flex"}`}>
          {!selectedCommunity ? (
            <div className="flex h-full items-center justify-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="text-center px-6"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
                  <Users size={28} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Pick a community</p>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">See what people are arguing about</p>
              </motion.div>
            </div>
          ) : (
            <SwipeBackWrapper onSwipeBack={clearSelectedCommunity} className="flex flex-col h-full min-h-0">
              <div className="overflow-y-auto scrollbar-thin flex-1">
                {/* Community banner header */}
                <div className="relative overflow-hidden">
                  {/* Gradient background strip */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{ background: headerGradient }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 h-16"
                    style={{ background: "linear-gradient(to top, var(--color-bg), transparent)" }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative p-5 md:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <CommunityIcon name={selectedCommunity.name} size={52} />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-extrabold text-[var(--color-text)] leading-tight">{selectedCommunity.name}</h2>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
                          {selectedCommunity.description}
                        </p>
                        {/* Stats row */}
                        <div className="mt-3 flex flex-wrap gap-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                            <Users size={12} />
                            <span className="font-semibold">{selectedCommunity.member_count?.toLocaleString()}</span>
                            <span className="text-[var(--color-text-dim)]">members</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                            <MessageSquare size={12} />
                            <span className="font-semibold">{selectedCommunity.post_count?.toLocaleString()}</span>
                            <span className="text-[var(--color-text-dim)]">posts</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-accent)] font-semibold">
                            <Flame size={12} className="fill-[var(--color-accent)]" />
                            <span>{Math.round(Number(selectedCommunity.conflict_score) * 100)}% conflict</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conflict meter */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--color-text-dim)] font-medium">Conflict level</span>
                        {selectedCommunity.conflict_score > 0.7 && (
                          <span className="text-[9px] font-bold text-[var(--color-red)] flex items-center gap-0.5">
                            <Zap size={8} /> HIGH TENSION
                          </span>
                        )}
                        {selectedCommunity.mod_election && (
                          <span className="text-[9px] font-bold text-[var(--color-gold)] flex items-center gap-0.5">
                            <Crown size={8} /> ELECTION
                          </span>
                        )}
                      </div>
                      <ConflictBar score={Number(selectedCommunity.conflict_score)} />
                    </div>

                    {/* Join button */}
                    <div className="mt-4">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleJoin}
                        disabled={!user || joining}
                        className="btn-primary h-9 text-sm w-full sm:w-auto"
                      >
                        <LogIn size={14} />
                        {joining ? "Joining..." : user ? "Join Community" : "Log in to join"}
                      </motion.button>
                    </div>
                  </motion.div>
                </div>

                {/* Elections */}
                <ElectionCard community={selectedCommunity} user={user} token={token} />

                {/* Posts */}
                <div className="p-4 md:p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={13} className="text-[var(--color-text-muted)]" />
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">Community Posts</span>
                  </div>

                  {communityPosts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <MessageSquare size={24} className="text-[var(--color-text-dim)]" />
                      <p className="text-sm text-[var(--color-text-muted)]">No posts yet in this community</p>
                    </div>
                  )}
                  <motion.div variants={container} initial="hidden" animate="visible" className="space-y-3">
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
                </div>
              </div>
            </SwipeBackWrapper>
          )}
        </div>
      </div>

      {lightboxImage && <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </motion.div>
  );
}
