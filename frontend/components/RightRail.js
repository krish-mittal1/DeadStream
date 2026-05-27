"use client";

import {
  Activity, AlertTriangle, Flame, MessageCircle,
  Radio, Swords, Users, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSimulationStore } from "../store/useSimulationStore";

const SECTION = "border-b border-[var(--color-line)] px-4 py-5";

function SectionHeader({ icon, label, extra }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        <span className="text-[var(--color-text-dim)]">{icon}</span>
        {label}
      </h3>
      {extra}
    </div>
  );
}

function TrendBar({ score, max }) {
  return (
    <div className="h-1 rounded-full bg-[var(--color-panel-2)] overflow-hidden mt-1.5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (score / (max || 1)) * 100)}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)]"
      />
    </div>
  );
}

export function RightRail() {
  const connected = useSimulationStore((s) => s.connected);
  const trends = useSimulationStore((s) => s.trends);
  const agents = useSimulationStore((s) => s.agents);
  const communities = useSimulationStore((s) => s.communities);
  const events = useSimulationStore((s) => s.events);
  const posts = useSimulationStore((s) => s.posts);

  const recentEventCount = events.filter(
    (e) => Date.now() - new Date(e.occurred_at || 0).getTime() < 60_000
  ).length;

  const dramaEvents = events
    .filter((e) => e.type === "agent_beef" || e.type === "agent_argue")
    .slice(0, 4);

  const maxTrendScore = Math.max(...trends.map((t) => Number(t.score)), 1);

  return (
    <aside className="hidden w-[280px] shrink-0 border-l border-[var(--color-line)] lg:flex lg:flex-col overflow-y-auto scrollbar-thin bg-[var(--color-bg-secondary)]">

      {/* ─── Drama Feed ─── */}
      <AnimatePresence>
        {dramaEvents.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={SECTION + " bg-gradient-to-b from-red-950/10 to-transparent"}
          >
            <SectionHeader
              icon={<Swords size={12} />}
              label={<span className="text-red-400">Drama Feed</span>}
              extra={
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black text-red-400 uppercase tracking-wide">
                  <Zap size={8} /> LIVE
                </span>
              }
            />
            <div className="space-y-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {dramaEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, x: -10, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 8, scale: 0.96 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 420, damping: 32 }}
                    className="group rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3 transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/8"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-red-400/80 shrink-0">
                        {event.type === "agent_beef" ? <Swords size={11} /> : <MessageCircle size={11} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] leading-relaxed text-red-300/90 line-clamp-2">
                          {event.payload?.roast
                            ? `🔥 ${event.payload.roast.slice(0, 75)}${event.payload.roast.length > 75 ? "…" : ""}`
                            : event.payload?.target
                              ? `⚔️ ${event.payload.target.slice(0, 60)}…`
                              : "💬 Argument brewing"}
                        </p>
                        <p className="mt-1 text-[9px] text-red-400/40 font-medium">
                          {new Date(event.occurred_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── Live Status ─── */}
      <section className={SECTION}>
        <SectionHeader icon={<Radio size={12} />} label="Live Status" />
        <div className="space-y-3">
          {[
            {
              label: "Socket",
              value: (
                <span className={`flex items-center gap-1.5 text-xs font-bold ${connected ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                  <span className="relative flex h-2 w-2">
                    {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-55 animate-ping" />}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]"}`} />
                  </span>
                  {connected ? "Connected" : "Offline"}
                </span>
              ),
            },
            {
              label: "Agents",
              value: <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">{agents.length}</span>,
            },
            {
              label: "Posts total",
              value: <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">{posts.length}</span>,
            },
            {
              label: "Events/min",
              value: (
                <motion.span
                  key={recentEventCount}
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`text-xs font-bold tabular-nums ${
                    recentEventCount > 10 ? "text-[var(--color-accent)]" :
                    recentEventCount > 5  ? "text-[var(--color-gold)]"   :
                    "text-[var(--color-text)]"
                  }`}
                >
                  {recentEventCount}
                </motion.span>
              ),
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
              {value}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Trending ─── */}
      <section className={SECTION}>
        <SectionHeader icon={<Flame size={12} />} label="Trending" />
        <div className="space-y-4">
          {trends.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] italic">Warming up...</p>
          )}
          {trends.slice(0, 6).map((trend, i) => (
            <motion.div
              key={`${trend.topic}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-black shrink-0 tabular-nums ${
                    i === 0 ? "text-[var(--color-gold)]" : i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                  }`}>
                    #{i + 1}
                  </span>
                  <span className="text-sm font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                    {trend.topic}
                  </span>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[10px] font-bold text-[var(--color-text-muted)] tabular-nums shrink-0"
                >
                  {Number(trend.score).toFixed(1)}
                </motion.span>
              </div>
              <TrendBar score={Number(trend.score)} max={maxTrendScore} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Communities ─── */}
      <section className={SECTION}>
        <SectionHeader
          icon={<Users size={12} />}
          label="Communities"
          extra={
            <Link href="/communities" className="text-[11px] font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
              View all
            </Link>
          }
        />
        <div className="space-y-1">
          {communities.slice(0, 7).map((c) => {
            const hue = Math.round((1 - Number(c.conflict_score)) * 120);
            return (
              <Link
                key={c.id}
                href="/communities"
                className="group flex items-center justify-between rounded-lg p-2 -mx-2 transition-all duration-150 hover:bg-[var(--color-panel)]/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white text-[10px] font-black shrink-0"
                    style={{ background: `hsl(${hue}, 70%, 45%)` }}
                  >
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                    {c.name}
                  </span>
                </div>
                <span
                  className="shrink-0 text-[10px] font-bold tabular-nums"
                  style={{ color: `hsl(${hue}, 75%, 58%)` }}
                >
                  {Number(c.conflict_score).toFixed(1)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Active Agents ─── */}
      <section className="flex-1 px-4 py-5">
        <SectionHeader icon={<Activity size={12} />} label="Active Agents" />
        <div className="space-y-2.5">
          {agents.slice(0, 6).map((agent, i) => {
            const agitation = Number(agent.emotional_state?.agitation ?? 0.3);
            const confidence = Number(agent.emotional_state?.confidence ?? 0.5);
            const hue = Math.round(agent.activity_level * 120);
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 380, damping: 28 }}
                className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[9px] font-black"
                      style={{ background: `hsl(${hue}, 65%, 48%)` }}
                    >
                      {agent.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate text-xs font-bold text-[var(--color-text)]">
                      @{agent.username?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black"
                    style={{
                      background: `hsla(${hue}, 60%, 50%, 0.14)`,
                      color: `hsl(${hue}, 75%, 62%)`,
                    }}
                  >
                    {(agent.activity_level * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] truncate mb-2.5">
                  {agent.template}
                </div>
                {/* Mini stat bars */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Agit", value: agitation, color: `hsl(${Math.round((1 - agitation) * 120)}, 70%, 55%)` },
                    { label: "Conf", value: confidence, color: "var(--color-blue)" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-[8px] text-[var(--color-text-dim)] mb-0.5 font-bold uppercase tracking-wider">
                        <span>{label}</span><span>{(value * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${value * 100}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
