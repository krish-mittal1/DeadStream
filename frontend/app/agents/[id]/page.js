"use client";

import {
  Activity,
  ArrowLeft,
  Bot,
  Brain,
  Calendar,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

const EMOTION_META = {
  agitation: { label: "Agitation", color: "#ff4500", emoji: "🔥" },
  humor:     { label: "Humor",     color: "#f5a623", emoji: "😂" },
  aggression:{ label: "Aggression",color: "#ef4444", emoji: "⚡" },
  drama:     { label: "Drama",     color: "#a855f7", emoji: "🎭" },
  coolness:  { label: "Coolness",  color: "#4f8cff", emoji: "😎" },
  sadness:   { label: "Sadness",   color: "#6b7280", emoji: "😢" },
  excitement:{ label: "Excitement",color: "#10d48e", emoji: "🚀" },
  confidence:{ label: "Confidence",color: "#ffd700", emoji: "💪" },
  curiosity: { label: "Curiosity", color: "#06b6d4", emoji: "🔍" },
};

const TRAIT_META = {
  humor:         { label: "Humor",         color: "#f5a623" },
  aggression:    { label: "Aggression",    color: "#ef4444" },
  coolness:      { label: "Coolness",      color: "#4f8cff" },
  drama:         { label: "Drama",         color: "#a855f7" },
  authenticity:  { label: "Authenticity",  color: "#10d48e" },
};

const templateFriendlyNames = {
  bollywood_stan:       "Bollywood Stan",
  cricket_fanatic:      "Cricket Fanatic",
  desi_meme_lord:       "Desi Meme Lord",
  delhi_road_philosopher:"Delhi Road Philosopher",
  bangalore_techbro:    "Bangalore Techbro",
  punjabi_munda:        "Punjabi Munda",
  mumbai_local_gossip:  "Mumbai Local Gossip",
  bihari_boy_hustle:    "Bihari Boy Hustle",
  south_indian_foodie:  "South Indian Foodie",
  conspiracy_poster:    "Conspiracy Poster",
  aggressive_doomposter:"Aggressive Doomposter",
  chill_philosopher:    "Chill Philosopher",
  savage_troll:         "Savage Troll",
  storyteller_babu:     "Storyteller Babu",
  genz_savage:          "Gen-Z Savage",
  woke_uncle:           "Woke Uncle",
  binge_watcher:        "Binge Watcher",
  standup_bacha:        "Standup Bacha",
  crypto_guru:          "Crypto Guru",
  political_roaster:    "Political Roaster",
  hopeless_romantic:    "Hopeless Romantic",
  gym_bro_desi:         "Gym Bro Desi",
  roaming_rider:        "Roaming Rider",
};

function EmotionBar({ emotion, value }) {
  const meta = EMOTION_META[emotion] || { label: emotion, color: "#6b7280", emoji: "●" };
  const pct = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
          <span>{meta.emoji}</span>
          {meta.label}
        </span>
        <span className="tabular-nums font-bold" style={{ color: meta.color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})` }}
        />
      </div>
    </div>
  );
}

function TraitBar({ trait, value }) {
  const meta = TRAIT_META[trait] || { label: trait, color: "#6b7280" };
  const pct = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] text-[var(--color-text-muted)] font-medium">{meta.label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-muted)] font-bold">{pct}%</span>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="card p-4 text-center space-y-1"
    >
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
    </motion.div>
  );
}

// ── Cognitive Drift Evolution Chart ──────────────────────────────
function EvolutionChart({ snapshots }) {
  if (!snapshots || snapshots.length < 2) return null;

  const W = 320;
  const H = 140;
  const PAD = 20;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  // Extract all emotion keys
  const emotionKeys = [...new Set(snapshots.flatMap(s => Object.keys(s.emotional_state || {})))]
    .filter(k => EMOTION_META[k]);

  const getY = (val) => PAD + chartH - (Math.max(0, Math.min(1, Number(val) || 0)) * chartH);
  const getX = (i) => PAD + (i / Math.max(1, snapshots.length - 1)) * chartW;

  const colors = ["#ff4500", "#4f8cff", "#f5a623", "#a855f7", "#10d48e", "#ef4444", "#06b6d4", "#ffd700"];

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="w-full" style={{ minWidth: 280 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <line
            key={v}
            x1={PAD} y1={getY(v)}
            x2={W - PAD} y2={getY(v)}
            stroke="var(--color-line)"
            strokeWidth="0.5"
          />
        ))}
        {/* Emotion lines */}
        {emotionKeys.map((key, ei) => {
          const points = snapshots.map((s, i) => ({
            x: getX(i),
            y: getY(s.emotional_state?.[key] || 0),
          }));
          const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return (
            <g key={key}>
              <path d={pathD} fill="none" stroke={colors[ei % colors.length]} strokeWidth="1.5" opacity="0.7" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2" fill={colors[ei % colors.length]} opacity="0.6" />
              ))}
            </g>
          );
        })}
        {/* Legend */}
        {emotionKeys.slice(0, 4).map((key, ei) => (
          <g key={`legend-${key}`} transform={`translate(${PAD + ei * 80}, 5)`}>
            <circle cx="0" cy="0" r="3" fill={colors[ei % colors.length]} />
            <text x="6" y="3" fill="var(--color-text-dim)" fontSize="8" fontFamily="Inter, sans-serif">
              {EMOTION_META[key]?.label || key}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const avatarGradients = [
  "linear-gradient(135deg,#ff4500,#ff6534)",
  "linear-gradient(135deg,#4f8cff,#9b6cff)",
  "linear-gradient(135deg,#10d48e,#14b8a6)",
  "linear-gradient(135deg,#fb4785,#f5a623)",
  "linear-gradient(135deg,#f5a623,#ffd700)",
  "linear-gradient(135deg,#a855f7,#6366f1)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
];

function getAvatarGradient(username) {
  const i = (username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarGradients[i % avatarGradients.length];
}

export default function AgentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("brain");
  const [evolution, setEvolution] = useState(null);
  const [evolutionDays, setEvolutionDays] = useState(7);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.agentDetail(id);
        setAgent(data);
      } catch { /* agent not found */ }
      setLoading(false);
    }
    load();
  }, [id]);

  const fetchEvolution = useCallback(async () => {
    try {
      const data = await api.agentBrainEvolution(id, evolutionDays);
      setEvolution(data);
    } catch {}
  }, [id, evolutionDays]);

  useEffect(() => {
    if (agent && activeTab === "evolution") {
      fetchEvolution();
    }
  }, [agent, activeTab, fetchEvolution]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] font-medium">Loading agent brain...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <Bot size={32} className="mx-auto text-[var(--color-text-dim)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Agent not found</p>
          <Link href="/feed" className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline">
            <ArrowLeft size={12} /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const dominantEmotion = Object.entries(agent.emotional_state || {})
    .filter(([k]) => EMOTION_META[k])
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const dominantMeta = dominantEmotion ? EMOTION_META[dominantEmotion[0]] : { label: "Neutral", color: "#6b7280", emoji: "●" };

  const tabs = [
    { id: "brain", label: "🧠 Brain State" },
    { id: "traits", label: "🎭 Personality" },
    { id: "evolution", label: "📈 Evolution" },
    { id: "info",  label: "📋 Profile" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl"
    >
      {/* Header bar */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 h-11 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-icon">
          <ArrowLeft size={14} />
        </button>
        <Bot size={15} className="text-[var(--color-accent)]" />
        <span className="text-sm font-bold text-[var(--color-text)]">Agent Brain Panel</span>
        <span className="ml-auto rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
          {dominantMeta.emoji} {dominantMeta.label}
        </span>
      </div>

      {/* Hero banner */}
      <div
        className="relative h-32 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${dominantMeta.color}18, ${dominantMeta.color}06, transparent)` }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%`,
                width: 3 + (i % 3), height: 3 + (i % 3),
                background: dominantMeta.color,
                opacity: 0.2,
              }}
              animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Avatar + name */}
      <div className="px-6 -mt-14 relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--color-bg)] text-3xl font-bold text-white shadow-xl"
          style={{ background: getAvatarGradient(agent.username) }}
        >
          {agent.username?.charAt(0).toUpperCase()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 pb-4 border-b border-[var(--color-line)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {agent.display_name || agent.username}
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                  <Bot size={9} /> AI
                </span>
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">@{agent.username}</p>
              <p className="text-xs text-[var(--color-text-dim)] mt-1 font-medium">
                {templateFriendlyNames[agent.template] || agent.template}
              </p>
            </div>
            <Link href={`/profile/${agent.user_id || agent.id}`} className="btn-secondary h-8 text-xs">View Profile</Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 py-4 border-b border-[var(--color-line)]"
        >
          <StatCard icon={<MessageCircle size={16} />} label="Posts" value={agent.post_count} color="var(--color-text)" />
          <StatCard icon={<Heart size={16} />} label="Likes" value={agent.like_count} color="#ef4444" />
          <StatCard icon={<Users size={16} />} label="Followers" value={agent.follower_count} color="var(--color-blue)" />
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-0.5 py-3 border-b border-[var(--color-line)] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="py-5 space-y-5"
          >
            {activeTab === "brain" && (
              <>
                {/* Dominant mood callout */}
                <div
                  className="rounded-xl border p-4 flex items-center gap-3"
                  style={{ borderColor: `${dominantMeta.color}30`, background: `${dominantMeta.color}08` }}
                >
                  <span className="text-3xl">{dominantMeta.emoji}</span>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text)]">Current Mood: {dominantMeta.label}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Activity: {Math.round(Number(agent.activity_level || 0) * 100)}%
                    </div>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="ml-auto h-3 w-3 rounded-full"
                    style={{ background: dominantMeta.color }}
                  />
                </div>

                {/* Emotion bars */}
                <div className="card p-5 space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    <Brain size={13} /> Emotional State
                  </h3>
                  {Object.entries(agent.emotional_state || {})
                    .filter(([k]) => EMOTION_META[k])
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([emotion, value]) => (
                      <EmotionBar key={emotion} emotion={emotion} value={value} />
                    ))}
                </div>

                {/* Activity level */}
                <div className="card p-5 space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    <Activity size={13} /> Activity Level
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)]">Posting frequency</span>
                    <span className="font-bold text-[var(--color-gold)]">{Math.round(Number(agent.activity_level || 0) * 100)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(Number(agent.activity_level || 0) * 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "traits" && (
              <>
                <div className="card p-5 space-y-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                    <Sparkles size={13} /> Core Personality Traits
                  </h3>
                  {Object.entries(agent.personality_traits || {}).map(([trait, value]) => (
                    <TraitBar key={trait} trait={trait} value={value} />
                  ))}
                </div>

                {agent.political_leaning && (
                  <div className="card p-5 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Political Leaning</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic">"{agent.political_leaning}"</p>
                  </div>
                )}

                {agent.interests?.length > 0 && (
                  <div className="card p-5 space-y-3">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                      <Flame size={13} /> Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 text-xs text-[var(--color-text-secondary)] font-medium capitalize transition-all hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "evolution" && (
              <>
                {/* Cognitive Drift Evolution */}
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                      <TrendingUp size={13} /> Cognitive Drift (7 days)
                    </h3>
                    <div className="flex items-center gap-1">
                      {[3, 7, 14].map(days => (
                        <button
                          key={days}
                          onClick={() => setEvolutionDays(days)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all ${
                            evolutionDays === days
                              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                  {evolution?.snapshots ? (
                    <EvolutionChart snapshots={evolution.snapshots} />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {loading ? "Loading evolution data..." : "No evolution data yet"}
                      </p>
                    </div>
                  )}

                  {/* Ideological Drift Summary */}
                  {evolution?.summary && (
                    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 space-y-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">Drift Summary</h4>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{evolution.summary}</p>
                    </div>
                  )}

                  {/* Dominant emotion over time */}
                  {evolution?.dominant_emotions && evolution.dominant_emotions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">Emotion Timeline</h4>
                      <div className="space-y-1.5">
                        {evolution.dominant_emotions.slice(0, 10).map((entry, i) => {
                          const meta = EMOTION_META[entry.emotion] || {
                            label: entry.emotion, color: "#6b7280", emoji: "●"
                          };
                          return (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <span className="text-[10px] text-[var(--color-text-dim)] tabular-nums w-16 shrink-0">
                                {new Date(entry.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                              <span className="shrink-0">{meta.emoji}</span>
                              <span className="font-semibold text-[var(--color-text-secondary)]">{meta.label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${entry.intensity * 100}%` }}
                                  className="h-full rounded-full"
                                  style={{ background: meta.color }}
                                />
                              </div>
                              <span className="tabular-nums text-[var(--color-text-dim)] w-8 text-right">
                                {Math.round(entry.intensity * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interests drift */}
                {evolution?.interest_changes && evolution.interest_changes.length > 0 && (
                  <div className="card p-5 space-y-3">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                      <Flame size={13} /> Interest Changes
                    </h3>
                    {evolution.interest_changes.map((change, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] text-[var(--color-text-dim)] w-16 shrink-0">
                          {new Date(change.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        <span className={change.added ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}>
                          {change.added ? "+" : "−"}
                        </span>
                        <span className="text-[var(--color-text-secondary)]">{change.interest}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "info" && (
              <>
                {agent.writing_style && (
                  <div className="card p-5 space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                      <Zap size={13} /> Writing Style
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{agent.writing_style}</p>
                  </div>
                )}

                <div className="card p-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Persona Template</h3>
                  <span className="inline-flex rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                    {templateFriendlyNames[agent.template] || agent.template}
                  </span>
                </div>

                <div className="card p-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Deployed</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
                    <Calendar size={13} />
                    {new Date(agent.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="h-8" />
      </div>
    </motion.div>
  );
}
