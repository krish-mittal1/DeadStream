"use client";

import { Activity, Flame, Radio, Users } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSimulationStore } from "../store/useSimulationStore";

export function RightRail() {
  const connected = useSimulationStore((s) => s.connected);
  const trends = useSimulationStore((s) => s.trends);
  const agents = useSimulationStore((s) => s.agents);
  const communities = useSimulationStore((s) => s.communities);
  const events = useSimulationStore((s) => s.events);

  const recentEventCount = events.filter(
    (e) => Date.now() - new Date(e.occurred_at || 0).getTime() < 60_000
  ).length;

  const sectionHeader = (icon, label) => (
    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
      <span className="text-[var(--color-text-dim)]">{icon}</span>
      {label}
    </h3>
  );

  return (
    <aside className="hidden w-[300px] shrink-0 border-l border-[var(--color-line)] bg-[var(--color-bg-secondary)] lg:flex lg:flex-col overflow-y-auto scrollbar-thin">
      {/* ─────── Live State ─────── */}
      <section className="border-b border-[var(--color-line)] px-5 py-5">
        {sectionHeader(<Radio size={13} />, "Live State")}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Socket</span>
            <span
              className={`flex items-center gap-1.5 font-medium transition-colors duration-300 ${
                connected ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {connected && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-60 animate-ping" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    connected ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]"
                  }`}
                />
              </span>
              {connected ? "connected" : "offline"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Agents</span>
            <span className="font-semibold text-[var(--color-text)] tabular-nums">
              {agents.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Events/min</span>
            <span
              className={`font-semibold tabular-nums transition-colors ${
                recentEventCount > 5
                  ? "text-[var(--color-gold)]"
                  : "text-[var(--color-text)]"
              }`}
            >
              {recentEventCount}
            </span>
          </div>
        </div>
      </section>

      {/* ─────── Trending ─────── */}
      <section className="border-b border-[var(--color-line)] px-5 py-5">
        {sectionHeader(<Flame size={13} />, "Trending")}
        <div className="space-y-4">
          {trends.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">No trends yet — warming up.</p>
          )}
          {trends.map((trend, index) => (
            <motion.div
              key={`${trend.topic}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium text-[var(--color-text)]">
                  #{trend.topic}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums">
                  {Number(trend.score).toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, Number(trend.score) * 25)}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────── Communities ─────── */}
      <section className="border-b border-[var(--color-line)] px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-dim)]">
              <Users size={13} />
            </span>
            Communities
          </h3>
          <Link
            href="/communities"
            className="text-[11px] font-medium text-[var(--color-accent)] transition-colors duration-200 hover:text-[var(--color-accent-hover)]"
          >
            View all
          </Link>
        </div>
        <div className="space-y-2.5">
          {communities.slice(0, 6).map((community) => (
            <Link
              key={community.id}
              href="/communities"
              className="group flex items-center justify-between text-sm"
            >
              <span className="truncate text-[var(--color-text)] transition-colors duration-200 group-hover:text-[var(--color-accent)]">
                {community.name}
              </span>
              <span
                className="shrink-0 text-xs font-medium tabular-nums"
                style={{
                  color: `hsl(${Math.round((1 - Number(community.conflict_score)) * 120)}, 75%, 60%)`,
                }}
              >
                {Number(community.conflict_score).toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────── Active Agents ─────── */}
      <section className="flex-1 overflow-auto px-5 py-5">
        {sectionHeader(<Activity size={13} />, "Active Agents")}
        <div className="space-y-3">
          {agents.slice(0, 8).map((agent, index) => {
            const agitation = Number(agent.emotional_state?.agitation ?? 0.3);
            const confidence = Number(agent.emotional_state?.confidence ?? 0.5);
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="truncate text-sm font-semibold text-[var(--color-text)]">
                    @{agent.username?.replace(/_/g, " ")}
                  </span>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold leading-none"
                    style={{
                      background: `hsla(${Math.round(agent.activity_level * 120)}, 60%, 50%, 0.12)`,
                      color: `hsl(${Math.round(agent.activity_level * 120)}, 75%, 60%)`,
                    }}
                  >
                    {(agent.activity_level * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] truncate mb-3 leading-relaxed">
                  {agent.template}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] text-[var(--color-text-dim)] mb-0.5 font-medium uppercase tracking-wider">
                      <span>Agitation</span>
                      <span>{(agitation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${agitation * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: `hsl(${Math.round((1 - agitation) * 120)}, 75%, 55%)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] text-[var(--color-text-dim)] mb-0.5 font-medium uppercase tracking-wider">
                      <span>Confidence</span>
                      <span>{(confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidence * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-blue)] to-[var(--color-violet)]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
