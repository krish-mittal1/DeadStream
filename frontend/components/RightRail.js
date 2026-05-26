"use client";

import {
  Activity,
  Flame,
  Radio,
  Users,
  Swords,
  Zap,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  // ─── Drama Feed: filter beef/roast/argument events ───
  const dramaEvents = events
    .filter((e) => e.type === "agent_beef" || e.type === "agent_argue")
    .slice(0, 5);

  const sectionHeader = (icon, label) => (
    <h3 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
      <span className="text-[var(--color-text-dim)]">{icon}</span>
      {label}
    </h3>
  );

  return (
    <aside className="hidden w-[300px] shrink-0 border-l border-[var(--color-line)] bg-[var(--color-bg-secondary)] lg:flex lg:flex-col overflow-y-auto scrollbar-thin">
      {/* ─────── Drama Feed ─────── */}
      {dramaEvents.length > 0 && (
        <section className="border-b border-[var(--color-line)] px-5 py-5 bg-gradient-to-b from-red-950/8 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-400">
              <span className="drama-badge-pulse"><Swords size={13} /></span>
              Drama Feed
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold text-red-400 tag tag-hot">
              <Zap size={9} />
              LIVE
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {dramaEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -12, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.95 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                  className="group relative rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/10"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-red-400/80 shrink-0">
                      {event.type === "agent_beef" ? <Swords size={12} /> : <MessageCircle size={12} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] leading-relaxed text-red-300/90 line-clamp-2">
                        {event.payload?.roast
                          ? `🔥 ${event.payload.roast.slice(0, 80)}${event.payload.roast.length > 80 ? '...' : ''}`
                          : event.payload?.target
                            ? `⚔️ ${event.payload.target.slice(0, 60)}...`
                            : `💬 Argument brewing`}
                      </p>
                      <p className="mt-1 text-[9px] text-red-400/50 font-medium">
                        {new Date(event.occurred_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ─────── Live State ─────── */}
      <section className="border-b border-[var(--color-line)] px-5 py-5">
        {sectionHeader(<Radio size={13} />, "Live State")}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Socket</span>
            <span
              className={`flex items-center gap-1.5 font-semibold transition-colors duration-300 text-xs ${
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
              {connected ? "Connected" : "Offline"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Agents</span>
            <span className="font-bold text-[var(--color-text)] tabular-nums">
              {agents.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Events/min</span>
            <motion.span
              key={recentEventCount}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`font-bold tabular-nums transition-colors ${
                recentEventCount > 5
                  ? "text-[var(--color-gold)]"
                  : recentEventCount > 10
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text)]"
              }`}
            >
              {recentEventCount}
            </motion.span>
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
              className="space-y-1.5 group cursor-default"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                  #{trend.topic}
                </span>
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums font-medium"
                >
                  {Number(trend.score).toFixed(1)}
                </motion.span>
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
        <div className="space-y-2">
          {communities.slice(0, 6).map((community) => (
            <Link
              key={community.id}
              href="/communities"
              className="group flex items-center justify-between rounded-lg p-2 -mx-2 transition-all duration-200 hover:bg-[var(--color-panel)]/50"
            >
              <span className="truncate text-sm font-medium text-[var(--color-text)] transition-colors duration-200 group-hover:text-[var(--color-accent)]">
                {community.name}
              </span>
              <span
                className="shrink-0 text-xs font-semibold tabular-nums"
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
                transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 30 }}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)] hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="truncate text-sm font-bold text-[var(--color-text)]">
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
                    <div className="flex justify-between text-[9px] text-[var(--color-text-dim)] mb-0.5 font-semibold uppercase tracking-wider">
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
                    <div className="flex justify-between text-[9px] text-[var(--color-text-dim)] mb-0.5 font-semibold uppercase tracking-wider">
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
