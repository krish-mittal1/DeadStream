"use client";

import {
  Flame,
  MessageSquare,
  Search,
  TrendingUp,
  Users,
  Zap,
  Activity,
  Vote,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
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
      <div className="flex-1 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span
        className="text-[10px] font-bold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
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

function CommunityCard({ community, onClick }) {
  const conflict = Number(community.conflict_score) || 0;
  const isHot = conflict > 0.65;
  const isNew = community.member_count < 20;

  return (
    <motion.button
      variants={itemAnim}
      layout
      onClick={onClick}
      className="w-full rounded-2xl border card hover:border-[var(--color-accent)]/30 hover:shadow-[var(--shadow-sm)] p-3.5 text-left transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <CommunityIcon name={community.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold text-[var(--color-text)] truncate flex-1 group-hover:text-[var(--color-accent)] transition-colors">
              {community.name}
            </span>
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
            <span className="flex items-center gap-1">
              <Users size={10} /> {community.member_count?.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={10} />{" "}
              {community.post_count?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={9} className="text-[var(--color-text-dim)] shrink-0" />
            <ConflictBar score={conflict} />
          </div>
        </div>
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
  const router = useRouter();
  const communities = useSimulationStore((s) => s.communities);
  const [searchQuery, setSearchQuery] = useState("");
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [sortBy, setSortBy] = useState("activity");

  useEffect(() => {
    if (communities.length === 0) {
      setCommunitiesLoading(true);
      api
        .communities()
        .then((c) => {
          useSimulationStore.setState({ communities: c });
          setCommunitiesLoading(false);
        })
        .catch(() => setCommunitiesLoading(false));
    }
  }, [communities.length]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ─── Sticky header ─── */}
      <div className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl px-4 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[13px] font-bold text-[var(--color-text)] tracking-tight">
            Communities
          </h1>
          {communities.length > 0 && (
            <span className="text-[10px] text-[var(--color-text-dim)] bg-[var(--color-panel)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
              {communities.length}
            </span>
          )}
        </div>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input-premium w-36 pl-7 pr-2 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* ─── Sort tabs ─── */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[var(--color-line)]">
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

      {/* ─── Community grid ─── */}
      <div className="p-4 md:p-5">
        {communitiesLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        )}
        {!communitiesLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Users size={28} className="text-[var(--color-text-dim)]" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No communities found
            </p>
          </div>
        )}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {filtered.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onClick={() => router.push(`/communities/${community.id}`)}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
