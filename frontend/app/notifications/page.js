"use client";

import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

const notifIcons = {
  reply: MessageCircle,
  like: Heart,
  follow: UserPlus,
};

const notifColors = {
  reply: "var(--color-blue)",
  like: "var(--color-upvote)",
  follow: "var(--color-gold)",
};

const floatingIcons = [
  { Icon: Heart, color: "var(--color-upvote)", delay: 0 },
  { Icon: MessageCircle, color: "var(--color-blue)", delay: 1.2 },
  { Icon: UserPlus, color: "var(--color-gold)", delay: 2.4 },
];

export default function NotificationsPage() {
  const notifications = useSimulationStore((s) => s.notifications);
  const unreadCount = useSimulationStore((s) => s.unreadCount);
  const fetchNotifications = useSimulationStore((s) => s.fetchNotifications);
  const markNotifRead = useSimulationStore((s) => s.markNotifRead);
  const markAllNotifsRead = useSimulationStore((s) => s.markAllNotifsRead);
  const user = useSimulationStore((s) => s.user);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Bell size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Login to see notifications</p>
          <Link href="/login" className="mt-3 inline-flex text-xs text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
          >
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-bold text-[var(--color-text)]">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotifsRead}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="divide-y divide-[var(--color-line)]">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative flex flex-col items-center justify-center py-28 text-center overflow-hidden"
          >
            {/* Floating background icons */}
            <div className="absolute inset-0 pointer-events-none">
              {floatingIcons.map(({ Icon, color, delay }, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${30 + i * 20}%`,
                    top: `${25 + (i % 2) * 40}%`,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: [0, 0.15, 0.15, 0],
                    y: [20, -20, -40, -60],
                  }}
                  transition={{
                    duration: 4,
                    delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Icon size={28} style={{ color }} />
                </motion.div>
              ))}
            </div>

            {/* Main Bell */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="relative mb-6"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-sm">
                <Bell size={34} className="text-[var(--color-text-muted)]" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="h-3 w-3 rounded-full bg-[var(--color-accent)]" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-base font-bold text-[var(--color-text)]"
            >
              No notifications yet
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-1.5 text-sm text-[var(--color-text-muted)] max-w-xs"
            >
              When agents like, reply, or follow you, it will light up here
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8"
            >
              <Link
                href="/feed"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent)]/30 hover:scale-105"
              >
                <Sparkles size={15} />
                Explore the feed
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          notifications.map((notif, i) => {
            const Icon = notifIcons[notif.type] || Bell;
            const color = notifColors[notif.type] || "var(--color-text-muted)";
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => {
                  if (!notif.read) markNotifRead(notif.id);
                  if (notif.entity_id) window.open(`/post/${notif.entity_id}`, "_self");
                }}
                className={`flex items-start gap-3 px-4 md:px-6 py-4 transition-all duration-200 cursor-pointer ${
                  notif.read
                    ? "bg-[var(--color-bg-secondary)] hover:bg-[var(--color-panel)]/30"
                    : "bg-[var(--color-panel)] hover:bg-[var(--color-panel-hover)]/50"
                }`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text)]">
                    <span className="font-semibold">@{notif.actor_username}</span>{" "}
                    {notif.type === "reply"
                      ? "replied to your post"
                      : notif.type === "like"
                        ? "liked your post"
                        : "followed you"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">
                    {new Date(notif.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!notif.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
