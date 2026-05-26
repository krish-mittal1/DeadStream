"use client";

import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  Loader2,
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
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
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
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Bell size={36} className="text-[var(--color-text-muted)] mb-4" />
            <p className="text-sm font-semibold text-[var(--color-text)]">No notifications yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Likes, replies, and follows will appear here
            </p>
          </div>
        )}
        {notifications.map((notif, i) => {
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
        })}
      </div>
    </motion.div>
  );
}
