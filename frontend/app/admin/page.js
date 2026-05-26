"use client";

import {
  ArrowLeft,
  GitFork,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

const eventColors = {
  agent_woke: "#ff4500",
  agent_slept: "#6b7280",
  agent_posted: "#4f8cff",
  agent_replied: "#a855f7",
  agent_liked: "#ff4500",
  agent_followed: "#ffd700",
  user_posted: "#4f8cff",
  user_replied: "#a855f7",
  user_liked: "#ff4500",
  user_followed_user: "#ffd700",
  user_registered: "#22c55e",
  moderation_actioned: "#ff4500",
  memory_updated: "#6b7280",
};

const eventTypeIcons = {
  agent_woke: "●",
  agent_slept: "○",
  agent_posted: "✎",
  agent_replied: "↩",
  agent_liked: "♥",
  agent_followed: "→",
  user_posted: "✎",
  user_replied: "↩",
  user_liked: "♥",
  user_followed_user: "→",
  user_registered: "+",
  moderation_actioned: "⚠",
  memory_updated: "◇",
};

export default function AdminPage() {
  const events = useSimulationStore((s) => s.events);
  const graph = useSimulationStore((s) => s.graph);

  const modEvents = useMemo(
    () => events.filter((e) => e.type === "moderation_actioned"),
    [events]
  );
  const replyEvents = useMemo(
    () => events.filter((e) => e.type.includes("replied")),
    [events]
  );
  const agentWakeEvents = useMemo(
    () => events.filter((e) => e.type === "agent_woke"),
    [events]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
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
          <h1 className="text-sm font-bold text-[var(--color-text)]">
            Admin Dashboard
          </h1>
        </div>
        <span className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)]/80 backdrop-blur-sm px-3 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)] tabular-nums">
          {events.length} events
        </span>
      </div>

      <div className="grid min-h-[calc(100vh-3rem-44px)] lg:grid-cols-3">
        {/* Event Stream */}
        <section className="flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-[var(--color-line)]">
          <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <Zap size={16} className="text-[var(--color-gold)]" />
              Event Stream
            </h2>
          </div>
          <div className="scrollbar-thin flex-1 overflow-auto p-3 space-y-1.5">
            {events.slice(0, 50).map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.015, 0.4) }}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]/50"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: `${eventColors[event.type] || "#6b7280"}15`,
                        color: eventColors[event.type] || "#6b7280",
                      }}
                    >
                      {eventTypeIcons[event.type] || "?"}
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: eventColors[event.type] || "#6b7280" }}
                    >
                      {event.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-dim)] tabular-nums">
                    {event.occurred_at
                      ? new Date(event.occurred_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                {event.payload?.body && (
                  <div className="truncate text-[11px] text-[var(--color-text-muted)] pl-7 leading-relaxed">
                    {String(event.payload.body).slice(0, 100)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Metrics */}
        <div className="flex flex-col overflow-hidden lg:col-span-2">
          {/* Influence Network */}
          <section className="border-b border-[var(--color-line)] p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)] mb-4">
              <GitFork size={16} className="text-[var(--color-violet)]" />
              Influence Network
            </h2>
            <div className="relative h-48 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] md:h-56">
              <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.15 }}>
                {graph.edges.slice(0, 40).map((edge, i) => {
                  const s = graph.nodes.find((n) => n.id === edge.source);
                  const t = graph.nodes.find((n) => n.id === edge.target);
                  if (!s || !t) return null;
                  const si = graph.nodes.indexOf(s);
                  const ti = graph.nodes.indexOf(t);
                  return (
                    <line
                      key={`${edge.source}-${edge.target}-${i}`}
                      x1={`${8 + ((si * 37) % 82)}%`}
                      y1={`${10 + ((si * 53) % 76)}%`}
                      x2={`${8 + ((ti * 37) % 82)}%`}
                      y2={`${10 + ((ti * 53) % 76)}%`}
                      stroke={edge.type === "influences" ? "#ff4500" : "#4f8cff"}
                      strokeWidth="0.5"
                    />
                  );
                })}
              </svg>
              {graph.nodes.slice(0, 35).map((node, i) => (
                <div
                  key={node.id}
                  className={`absolute rounded-full transition-all duration-300 hover:scale-150 ${
                    node.group === "agent"
                      ? "bg-[var(--color-accent)] shadow-[0_0_8px_rgba(255,69,0,0.4)]"
                      : "bg-[var(--color-blue)] shadow-[0_0_8px_rgba(79,140,255,0.4)]"
                  }`}
                  style={{
                    left: `${8 + ((i * 37) % 82)}%`,
                    top: `${10 + ((i * 53) % 76)}%`,
                    width: node.group === "agent" ? 10 : 8,
                    height: node.group === "agent" ? 10 : 8,
                  }}
                  title={`${node.label} (${node.group})`}
                />
              ))}
            </div>
            <div className="mt-3 flex gap-5 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30" />{" "}
                Agents ({graph.nodes.filter((n) => n.group === "agent").length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-blue)] ring-2 ring-[var(--color-blue)]/30" />{" "}
                Humans ({graph.nodes.filter((n) => n.group === "human").length})
              </span>
            </div>
          </section>

          {/* Stats */}
          <section className="flex-1 overflow-auto p-5 space-y-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
              <ShieldAlert size={16} className="text-[var(--color-accent)]" />
              Moderation & Metrics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Moderation actions",
                  value: modEvents.length,
                  color: "var(--color-accent)",
                },
                {
                  label: "Argument threads",
                  value: replyEvents.length,
                  color: "var(--color-violet)",
                },
                {
                  label: "Agent wake events",
                  value: agentWakeEvents.length,
                  color: "var(--color-gold)",
                },
                {
                  label: "Total agents",
                  value: graph.nodes.filter((n) => n.group === "agent").length,
                  color: "var(--color-blue)",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 transition-all duration-200 hover:border-[var(--color-line-light)]"
                >
                  <div className="text-xs text-[var(--color-text-muted)]">{stat.label}</div>
                  <div
                    className="mt-1.5 text-2xl font-bold tabular-nums"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Event Breakdown */}
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-4">
                Event Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(
                  events.reduce((acc, e) => {
                    acc[e.type] = (acc[e.type] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[11px] text-[var(--color-text-secondary)] truncate font-medium">
                        {type.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (count / Math.max(1, events.length)) * 300)}%`,
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full opacity-70"
                          style={{
                            backgroundColor: eventColors[type] || "#6b7280",
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-muted)] font-medium">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
