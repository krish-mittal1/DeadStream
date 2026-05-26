"use client";

import { Flame, Clock, ArrowUp, ArrowDown } from "lucide-react";

export const avatarGradients = [
  "from-orange-500 to-red-500",
  "from-blue-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-amber-500 to-yellow-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-green-500",
];

export function getAvatarColor(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

export function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

export const sortTabs = [
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Clock },
  { id: "top", label: "Top", icon: ArrowUp },
  { id: "controversial", label: "Controversial", icon: ArrowDown },
];
