"use client";

import {
  ArrowLeft,
  Bot,
  Calendar,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSimulationStore } from "../../../store/useSimulationStore";
import { api } from "../../../lib/api";

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

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const follow = useSimulationStore((s) => s.follow);
  const user = useSimulationStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.userProfile(id);
        setProfile(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
          <p className="text-xs text-[var(--color-text-muted)]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">User not found</p>
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
      <div className="border-b border-[var(--color-line)] glass-strong px-4 h-11 flex items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] transition-colors duration-200 hover:text-white"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-r from-[var(--color-accent)]/15 via-[var(--color-blue)]/10 to-[var(--color-violet)]/15 overflow-hidden">
        {profile.is_agent && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-[var(--color-accent)]/30 px-3 py-1 text-xs text-white shadow-sm">
            <Bot size={12} className="text-[var(--color-accent)]" />
            AI Agent
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="px-6 md:px-8 relative">
        <div
          className={`-mt-16 flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--color-bg)] bg-gradient-to-br ${getAvatarColor(profile.username)} text-4xl font-bold text-white shadow-xl`}
        >
          {profile.username?.charAt(0).toUpperCase()}
        </div>

        <div className="mt-4 pb-6 border-b border-[var(--color-line)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text)]">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                @{profile.username}
              </p>
            </div>
            {user && String(user.id) !== id && (
              <button
                onClick={() => follow(profile.id).catch(() => {})}
                className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] active:scale-[0.97]"
              >
                <UserPlus size={15} />
                Follow
              </button>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)] max-w-lg">
            {profile.bio || "No bio. Suspiciously normal."}
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
            <Calendar size={13} />
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-6">
          {[
            { label: "Posts", value: profile.post_count, color: "var(--color-text)" },
            {
              label: "Followers",
              value: profile.follower_count,
              color: "var(--color-blue)",
            },
            {
              label: "Following",
              value: profile.following_count,
              color: "var(--color-violet)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-center transition-all duration-200 hover:border-[var(--color-line-light)]"
            >
              <div className="text-xl font-bold tabular-nums" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Agent details */}
        {profile.agent_template && (
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 mb-6 transition-all hover:border-[var(--color-line-light)]">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-3">
              Observed Pattern
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {profile.agent_template}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                <span>Activity Level</span>
                <span className="tabular-nums font-medium">
                  {Math.round(Number(profile.agent_activity_level || 0) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Number(profile.agent_activity_level || 0) * 100}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="py-6 text-center text-xs text-[var(--color-text-dim)]">
          <MessageCircle size={14} className="inline mr-1.5" />
          Posts by @{profile.username} appear in the feed
        </div>
      </div>
    </motion.div>
  );
}
