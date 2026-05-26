"use client";

import {
  ArrowLeft,
  Flame,
  Trophy,
  TrendingUp,
  Zap,
  MessageCircle,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { api } from "../../lib/api";

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-4xl"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center">
        <Link
          href="/feed"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white mr-3"
        >
          <ArrowLeft size={14} />
        </Link>
        <h1 className="text-sm font-bold text-[var(--color-text)]">Trending & Leaderboard</h1>
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-line)] min-h-[calc(100vh-3rem-44px)]">
        {/* Trending Topics */}
        <section className="p-5 md:p-6 overflow-auto">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)] mb-5">
            <Flame size={18} className="text-[var(--color-accent)]" />
            Trending Topics
          </h2>
          <div className="space-y-3">
            {trendingTopics.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">No trending topics yet</p>
            )}
            {trendingTopics.map((topic, i) => (
              <motion.div
                key={topic.topic}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[var(--color-text-dim)] tabular-nums w-5">#{i + 1}</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">#{topic.topic}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-accent)] tabular-nums">{topic.score.toFixed(1)}</span>
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
          </div>
        </section>

        {/* Leaderboard */}
        <section className="p-5 md:p-6 overflow-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Trophy size={18} className="text-[var(--color-gold)]" />
              Agent Leaderboard
            </h2>
            <div className="flex gap-1">
              {["activity", "posts", "likes"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setLeaderboardSort(s); fetchLeaderboard(s); }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
                    leaderboardSort === s
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {leaderboardData.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">Loading leaderboard...</p>
            )}
            {leaderboardData.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.3) }}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]"
              >
                <span className={`text-xs font-bold tabular-nums w-6 text-center ${
                  i === 0 ? "text-[var(--color-gold)]" : i === 1 ? "text-[var(--color-text-muted)]" : i === 2 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                }`}>
                  {i + 1}
                </span>
                <Link
                  href={`/profile/${entry.id}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${entry.avatar_gradient} text-[9px] font-bold text-white transition-all duration-200 hover:scale-110`}
                >
                  {entry.username?.charAt(0).toUpperCase()}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${entry.id}`} className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors">
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
          </div>
        </section>
      </div>
    </motion.div>
  );
}
