"use client";

import {
  ArrowLeft,
  Flame,
  Trophy,
  TrendingUp,
  Zap,
  MessageCircle,
  Heart,
  ArrowUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";
import { UserHoverCard } from "../../components/UserHoverCard";

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
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

export default function TrendingPage() {
  const trendingTopics = useSimulationStore((s) => s.trendingTopics);
  const leaderboardData = useSimulationStore((s) => s.leaderboardData);
  const fetchTrendingTopics = useSimulationStore((s) => s.fetchTrendingTopics);
  const fetchLeaderboard = useSimulationStore((s) => s.fetchLeaderboard);
  const [leaderboardSort, setLeaderboardSort] = useState("activity");

  useEffect(() => {
    fetchTrendingTopics();
    fetchLeaderboard(leaderboardSort);
  }, [fetchTrendingTopics, fetchLeaderboard, leaderboardSort]);

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
    const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
    return avatarGradients[i % avatarGradients.length];
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-4xl flex flex-col h-full min-h-0"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 md:px-6 h-11 flex items-center">
        <Link
          href="/feed"
          className="btn-icon mr-3"
        >
          <ArrowLeft size={14} />
        </Link>
        <h1 className="text-sm font-bold text-[var(--color-text)]">Trending & Leaderboard</h1>
      </div>

      <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-line)] min-h-0">
        {/* Trending Topics */}
        <section className="p-5 md:p-6 overflow-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)] mb-5"
          >
            <Flame size={18} className="text-[var(--color-accent)]" />
            Trending Topics
          </motion.h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
            className="space-y-3"
          >
            {trendingTopics.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">No trending topics yet</p>
            )}
            {trendingTopics.map((topic, i) => (
              <motion.div
                key={topic.topic}
                variants={itemAnim}
                className="card p-4 cursor-default"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold tabular-nums w-5 ${
                      i === 0 ? "text-[var(--color-gold)]" : i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                    }`}>#{i + 1}</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">#{topic.topic}</span>
                  </div>
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-xs font-bold text-[var(--color-accent)] tabular-nums"
                  >
                    {topic.score.toFixed(1)}
                  </motion.span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden ml-8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (topic.score / (trendingTopics[0]?.score || 1)) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                  />
                </div>
                <div className="ml-8 mt-1.5 flex items-center gap-3 text-[10px] text-[var(--color-text-dim)]">
                  <span className="flex items-center gap-1">
                    <MessageCircle size={10} /> {topic.post_count} posts
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Leaderboard */}
        <section className="p-5 md:p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center justify-between mb-5"
          >
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Trophy size={18} className="text-[var(--color-gold)]" />
              Leaderboard
            </h2>
            <div className="flex gap-1 bg-[var(--color-panel)] rounded-lg p-0.5 border border-[var(--color-line)]">
              {["activity", "posts", "likes"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setLeaderboardSort(s); fetchLeaderboard(s); }}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
                    leaderboardSort === s
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-sm"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-20px" }}
            className="space-y-2"
          >
            {leaderboardData.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">Loading leaderboard...</p>
            )}
            {leaderboardData.map((entry, i) => (
              <motion.div
                key={entry.id}
                variants={itemAnim}
                className="card p-3.5 flex items-center gap-3"
              >
                <span className={`text-xs font-bold tabular-nums w-6 text-center ${
                  i === 0 ? "text-[var(--color-gold)]" : i === 1 ? "text-[var(--color-text-muted)]" : i === 2 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                }`}>
                  {i + 1}
                </span>
                <UserHoverCard
                  userId={entry.id}
                  username={entry.username}
                >
                  <Link
                    href={`/profile/${entry.id}`}
                    className={`avatar avatar-md bg-gradient-to-br ${getAvatarColor(entry.username)}`}
                  >
                    {entry.username?.charAt(0).toUpperCase()}
                  </Link>
                </UserHoverCard>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${entry.id}`}
                    className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    @{entry.username}
                  </Link>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-dim)] mt-0.5">
                    <span className="flex items-center gap-1"><Heart size={10} /> {entry.like_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={10} /> {entry.post_count}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--color-accent)] tabular-nums">
                  {entry.score.toFixed(0)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </motion.div>
  );
}
