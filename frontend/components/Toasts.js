"use client";

import {
  Bot,
  Flame,
  Heart,
  MessageCircle,
  Swords,
  Zap,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useCallback, useState, useRef } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

const TOAST_DURATION = 5000;
const MAX_TOASTS = 4;

export function Toasts() {
  const events = useSimulationStore((s) => s.events);
  const [toasts, setToasts] = useState([]);
  const prevEventsRef = useRef(0);

  const addToast = useCallback((event) => {
    const icons = {
      agent_woke: Bot,
      agent_posted: MessageCircle,
      agent_replied: MessageCircle,
      agent_liked: Heart,
      agent_followed: Heart,
      agent_beef: Swords,
      agent_argue: MessageCircle,
      user_posted: MessageCircle,
      user_liked: Heart,
    };
    const colors = {
      agent_woke: "var(--color-accent)",
      agent_posted: "var(--color-blue)",
      agent_replied: "var(--color-violet)",
      agent_liked: "var(--color-upvote)",
      agent_followed: "var(--color-gold)",
      agent_beef: "var(--color-red)",
      agent_argue: "var(--color-rose)",
      user_posted: "var(--color-blue)",
      user_liked: "var(--color-upvote)",
    };
    const labels = {
      agent_woke: "Agent woke up",
      agent_posted: "New post",
      agent_replied: "Reply",
      agent_liked: "Liked",
      agent_followed: "Followed",
      agent_beef: "⚔️ Beef started",
      agent_argue: "Argument",
      user_posted: "New post",
      user_liked: "Liked",
    };

    const Icon = icons[event.type] || Bot;
    const color = colors[event.type] || "var(--color-text-muted)";
    const label = labels[event.type] || "Event";

    const toastEventTypes = [
      "agent_posted",
      "agent_replied",
      "agent_beef",
      "agent_argue",
      "agent_liked",
      "agent_followed",
      "agent_woke",
    ];
    if (!toastEventTypes.includes(event.type)) return;

    const id = `${event.id}-${Date.now()}`;
    const toast = {
      id,
      type: event.type,
      icon: Icon,
      color,
      label,
      username:
        event.payload?.author_username ||
        event.payload?.actor_username ||
        event.payload?.target ||
        "An agent",
      message:
        event.type === "agent_beef"
          ? event.payload?.roast?.slice(0, 60) ||
            `started beef with ${event.payload?.target || "someone"}`
          : event.payload?.title?.slice(0, 60) ||
            event.payload?.body?.slice(0, 60) ||
            event.type.replace("agent_", "").replace("_", " "),
      createdAt: Date.now(),
    };

    setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  useEffect(() => {
    if (events.length > prevEventsRef.current) {
      const newEvents = events.slice(0, events.length - prevEventsRef.current);
      newEvents.forEach((event) => addToast(event));
    }
    prevEventsRef.current = events.length;
  }, [events.length, addToast]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className="toast group"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${toast.color}18` }}
            >
              <toast.icon size={16} style={{ color: toast.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: toast.color }}
                >
                  {toast.label}
                </span>
                <span className="text-[9px] text-[var(--color-text-dim)] tabular-nums ml-auto">
                  {Math.floor((Date.now() - toast.createdAt) / 1000)}s ago
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[var(--color-text)] font-medium">
                {toast.username}
              </p>
              {toast.message && (
                <p className="truncate text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn-icon w-6 h-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
