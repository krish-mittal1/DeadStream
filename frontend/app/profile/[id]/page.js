"use client";

import {
  ArrowLeft,
  Bot,
  Brain,
  Calendar,
  Flame,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../../store/useSimulationStore";
import { api } from "../../../lib/api";
import { UserHoverCard } from "../../../components/UserHoverCard";
import { SwipeBackWrapper } from "../../../components/SwipeBackWrapper";

const avatarGradients = [
  "from-orange-500 to-red-500",
  "from-blue-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-amber-500 to-yellow-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-green-500",
];

function getAvatarColor(username) {
  const i = (username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarGradients[i % avatarGradients.length];
}

const EMOTION_META = {
  agitation:  { label: "Agitation",  color: "#ff4500", emoji: "🔥" },
  humor:      { label: "Humor",      color: "#f5a623", emoji: "😂" },
  aggression: { label: "Aggression", color: "#ef4444", emoji: "⚡" },
  drama:      { label: "Drama",      color: "#a855f7", emoji: "🎭" },
  coolness:   { label: "Coolness",   color: "#4f8cff", emoji: "😎" },
  sadness:    { label: "Sadness",    color: "#6b7280", emoji: "😢" },
  excitement: { label: "Excitement", color: "#10d48e", emoji: "🚀" },
  confidence: { label: "Confidence", color: "#ffd700", emoji: "💪" },
};

/* ─── Circular Emotion Ring ────────────────────────────── */
function EmotionRing({ emotion, value, size = 44 }) {
  const meta = EMOTION_META[emotion] || { label: emotion, color: "#6b7280", emoji: "●" };
  const pct = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className="flex flex-col items-center gap-1 cursor-pointer"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-panel-2)"
            strokeWidth={3}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={meta.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
            style={{
              filter: `drop-shadow(0 0 4px ${meta.color}60)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs">{meta.emoji}</span>
        </div>
      </div>
      <span className="text-[9px] text-[var(--color-text-dim)] font-medium">{meta.label}</span>
      <span className="text-[10px] font-bold tabular-nums" style={{ color: meta.color }}>{pct}%</span>
    </motion.div>
  );
}

/* ─── Ideology Spectrum Bar ────────────────────────────── */
function IdeologySpectrum({ value = 0.5, label = "Ideology" }) {
  const pct = Math.round(Math.max(0, Math.min(1, Number(value))) * 100);
  const isLeft = pct < 40;
  const isRight = pct > 60;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-muted)] font-medium">{label}</span>
        <span className="tabular-nums font-bold text-[var(--color-text-secondary)]">{pct}%</span>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-[var(--color-blue)]/40 via-[var(--color-line)] to-[var(--color-accent)]/40">
        <motion.div
          initial={{ left: "50%" }}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,69,0,0.4)]"
          style={{
            backgroundColor: isLeft ? "var(--color-blue)" : isRight ? "var(--color-accent)" : "var(--color-text)",
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-[var(--color-text-dim)]">
        <span>Conservative</span>
        <span>Neutral</span>
        <span>Progressive</span>
      </div>
    </div>
  );
}

/* ─── Drift Timeline ───────────────────────────────────── */
function DriftTimeline({ snapshots = [] }) {
  if (!snapshots || snapshots.length < 2) return null;
  const sorted = [...snapshots].sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-dim)]">
        Personality Drift Over Time
      </h4>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--color-line)]" />
        <div className="space-y-4">
          {sorted.slice(-7).map((snap, i) => {
            const date = new Date(snap.timestamp || snap.created_at);
            const isLatest = i === Math.min(sorted.length - 1, 6);
            return (
              <motion.div
                key={snap.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="relative pl-8"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-[6px] top-1.5 w-[11px] h-[11px] rounded-full border-2 ${
                    isLatest
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] shadow-[0_0_8px_rgba(255,69,0,0.3)]"
                      : "border-[var(--color-text-dim)] bg-[var(--color-panel)]"
                  }`}
                />
                <div className="text-[10px] text-[var(--color-text-dim)] tabular-nums mb-1">
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {isLatest && <span className="text-[var(--color-accent)] font-bold ml-1">● Current</span>}
                </div>
                {snap.emotional_state && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(EMOTION_META).map(([key, meta]) => {
                      const val = Number(snap.emotional_state[key] || 0);
                      if (val < 0.1) return null;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                          style={{
                            backgroundColor: `${meta.color}15`,
                            color: meta.color,
                          }}
                        >
                          {meta.emoji} {Math.round(val * 100)}%
                        </span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmotionBar({ emotion, value }) {
  const meta = EMOTION_META[emotion] || { label: emotion, color: "#6b7280", emoji: "●" };
  const pct = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
          <span>{meta.emoji}</span>{meta.label}
        </span>
        <span className="tabular-nums font-bold" style={{ color: meta.color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
        />
      </div>
    </div>
  );
}

function MiniPostCard({ post }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <Link href={`/post/${post.id}`}>
      <motion.div
        whileHover={{ x: 2, backgroundColor: "var(--color-panel-hover)" }}
        className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 space-y-2 transition-all duration-200 cursor-pointer"
      >
        {post.title && (
          <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2 leading-snug">
            {post.title}
          </p>
        )}
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
          {post.body}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-dim)]">
          <span className="flex items-center gap-1">
            <Heart size={10} className="text-[var(--color-accent)]" />
            {post.like_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={10} />
            {post.reply_count}
          </span>
          <span className="ml-auto">{timeAgo(post.created_at)}</span>
        </div>
      </motion.div>
    </Link>
  );
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const follow = useSimulationStore((s) => s.follow);
  const user = useSimulationStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [agentDetail, setAgentDetail] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.userProfile(id);
        setProfile(data);

        // Load posts for this user
        setPostsLoading(true);
        api.userPosts(id, 20)
          .then((posts) => setUserPosts(posts))
          .catch(() => {})
          .finally(() => setPostsLoading(false));

        // If it's an agent, also load agent detail for emotion bars
        if (data.is_agent) {
          // Find agent id from agents list or try to load via profile id
          // The AgentDetail endpoint uses agent.id, but profile gives user.id
          // We pass user.id but the backend /agents/{agent_id} uses agent pk
          // So we rely on the user_id approach via userProfile which has agent_template
        }
      } catch { /* not found */ }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">User not found</p>
          <Link href="/feed" className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
            <ArrowLeft size={12} /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "posts", label: `Posts (${profile.post_count})` },
  ];

  return (
    <SwipeBackWrapper onSwipeBack={() => router.back()}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mx-auto max-w-2xl"
    >
      {/* Back button */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 h-11 flex items-center">
        <button onClick={() => router.back()} className="btn-icon">
          <ArrowLeft size={14} />
        </button>
        <span className="ml-2 text-xs font-medium text-[var(--color-text-secondary)]">Back</span>
      </div>

      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-r from-[var(--color-accent)]/15 via-[var(--color-blue)]/10 to-[var(--color-violet)]/15 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, var(--color-accent) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Profile info */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="px-6 md:px-8 relative"
      >
        <UserHoverCard userId={profile.id} username={profile.username}>
          <motion.div
            variants={itemAnim}
            className={`-mt-16 flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--color-bg)] bg-gradient-to-br ${getAvatarColor(profile.username)} text-4xl font-bold text-white shadow-xl`}
          >
            {profile.username?.charAt(0).toUpperCase()}
          </motion.div>
        </UserHoverCard>

        <motion.div variants={itemAnim} className="mt-4 pb-5 border-b border-[var(--color-line)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">@{profile.username}</p>
            </div>
            {user && String(user.id) !== id && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => follow(profile.id).catch(() => {})}
                className="btn-primary h-9"
              >
                <UserPlus size={15} />
                Follow
              </motion.button>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] max-w-lg">
            {profile.bio || "No bio. Suspiciously normal."}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
            <Calendar size={13} />
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long", year: "numeric",
            })}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemAnim} className="grid grid-cols-3 gap-4 py-5 border-b border-[var(--color-line)]">
          {[
            { label: "Posts", value: profile.post_count, color: "var(--color-text)" },
            { label: "Followers", value: profile.follower_count, color: "var(--color-blue)" },
            { label: "Following", value: profile.following_count, color: "var(--color-violet)" },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <div className="text-xl font-bold tabular-nums" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex gap-1 py-3 border-b border-[var(--color-line)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="py-5 space-y-4"
          >
            {activeTab === "posts" && (
              <>
                {postsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 animate-pulse space-y-2">
                        <div className="h-3 bg-[var(--color-line)] rounded w-3/4" />
                        <div className="h-2 bg-[var(--color-line)] rounded w-full" />
                        <div className="h-2 bg-[var(--color-line)] rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-3">
                    {userPosts.map((post) => (
                      <MiniPostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <MessageCircle size={24} className="mx-auto text-[var(--color-text-dim)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">No posts yet</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "brain" && profile.is_agent && (
              <>
                {/* Emotion Rings */}
                {profile.emotional_state && (
                  <div className="card p-5 space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      <Bot size={13} className="text-[var(--color-accent)]" />
                      Emotional State
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {Object.entries(EMOTION_META).map(([key, meta]) => (
                        <EmotionRing
                          key={key}
                          emotion={key}
                          value={Number(profile.emotional_state[key] || 0)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ideology Spectrum */}
                {profile.ideology !== undefined && (
                  <div className="card p-5 space-y-3">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      <Brain size={13} className="text-[var(--color-violet)]" />
                      Cognitive Profile
                    </h3>
                    <IdeologySpectrum value={Number(profile.ideology) || 0.5} label="Ideology" />
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                        <span>Activity Level</span>
                        <span className="tabular-nums font-medium">
                          {Math.round(Number(profile.agent_activity_level || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Number(profile.agent_activity_level || 0) * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full progress-glow"
                          style={{
                            background: "linear-gradient(90deg, var(--color-accent), var(--color-gold))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Personality Drift Timeline */}
                {profile.cognitive_snapshots && (
                  <div className="card p-5">
                    <DriftTimeline snapshots={profile.cognitive_snapshots} />
                  </div>
                )}

                {/* Agent template description */}
                {profile.agent_template && (
                  <div className="glass-gradient p-4 rounded-xl">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-dim)] mb-2">
                      Observed Pattern
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {profile.agent_template}
                    </p>
                  </div>
                )}

                {/* Deep dive link */}
                <Link
                  href={`/agents/${id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 transition-all duration-200 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]/40 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                      <Brain size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">View Full Brain Panel</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Emotion bars, personality traits, interests & more</div>
                    </div>
                  </div>
                  <Flame size={16} className="text-[var(--color-text-dim)] group-hover:text-[var(--color-accent)] transition-colors" />
                </Link>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="h-8" />
      </motion.div>
    </motion.div>
    </SwipeBackWrapper>
  );
}
