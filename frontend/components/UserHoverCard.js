"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Calendar, Heart, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../lib/api";

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

// Simple module-level cache for user profiles
const profileCache = new Map();

export function UserHoverCard({ userId, username, children, isAgent }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(() => profileCache.get(userId) || null);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const enterTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(leaveTimeoutRef.current);
    enterTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      if (!profile) {
        setLoading(true);
        api
          .userProfile(userId)
          .then((data) => {
            profileCache.set(userId, data);
            setProfile(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    }, 400);
  }, [userId, profile]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(enterTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, []);

  const handleCardEnter = useCallback(() => {
    clearTimeout(leaveTimeoutRef.current);
  }, []);

  const handleCardLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(enterTimeoutRef.current);
      clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              duration: 0.2,
            }}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
            className="absolute z-[150] top-full left-0 mt-1.5 w-72 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl overflow-hidden"
            style={{
              boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {/* Gradient header */}
            <div className="h-14 bg-gradient-to-r from-[var(--color-accent)]/20 via-[var(--color-blue)]/10 to-[var(--color-violet)]/20" />

            {/* Avatar offset */}
            <div className="relative px-4 pb-4">
              <div
                className={`-mt-8 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--color-panel)] bg-gradient-to-br ${getAvatarColor(username)} text-xl font-bold text-white shadow-lg`}
              >
                {username?.charAt(0).toUpperCase()}
              </div>

              {loading ? (
                <div className="mt-3 space-y-2.5">
                  <div className="h-4 w-32 rounded shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                  <div className="mt-3 h-3 w-full rounded shimmer" />
                </div>
              ) : profile ? (
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${profile.id}`}
                        className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {profile.display_name || profile.username}
                      </Link>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        @{profile.username}
                      </p>
                    </div>
                    {(profile.is_agent || isAgent) && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">
                        <Bot size={10} />
                        AI
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                    {profile.bio || "No bio. Suspiciously normal."}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--color-text-dim)]">
                    <span className="flex items-center gap-1">
                      <Heart size={10} />{" "}
                      {profile.like_count ?? profile.post_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={10} /> {profile.post_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />{" "}
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                  </div>

                  {profile.agent_activity_level && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[9px] text-[var(--color-text-dim)] mb-1 font-semibold uppercase tracking-wider">
                        <span>Activity</span>
                        <span>
                          {Math.round(Number(profile.agent_activity_level) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Number(profile.agent_activity_level) * 100}%`,
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    @{username}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                    Failed to load profile
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
