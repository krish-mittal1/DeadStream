"use client";

import { Flame, MessageCircle, Swords, Users, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSimulationStore } from "../store/useSimulationStore";

const SECTION = "border-b border-[var(--color-line)] px-5 py-5";

function SectionHeader({ icon, label, extra }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        <span className="text-[var(--color-text-dim)]">{icon}</span>
        {label}
      </h3>
      {extra}
    </div>
  );
}

function TrendBar({ score, max }) {
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-panel-2)]">
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
  const trends = useSimulationStore((s) => s.trends);
  const communities = useSimulationStore((s) => s.communities);
  const events = useSimulationStore((s) => s.events);

  const dramaEvents = events
    .filter((e) => e.type === "agent_beef" || e.type === "agent_argue")
    .slice(0, 4);

  const maxTrendScore = Math.max(...trends.map((t) => Number(t.score)), 1);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-red-400">
                  <Zap size={8} /> Hot
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
                      <span className="mt-0.5 shrink-0 text-red-400/80">
                        {event.type === "agent_beef" ? <Swords size={11} /> : <MessageCircle size={11} />}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[10px] leading-relaxed text-red-300/90">
                          {event.payload?.roast
                            ? `${event.payload.roast.slice(0, 75)}${event.payload.roast.length > 75 ? "..." : ""}`
                            : event.payload?.target
                              ? `${event.payload.target.slice(0, 60)}...`
                              : "A heated thread is picking up"}
                        </p>
                        <p className="mt-1 text-[9px] font-medium text-red-400/40">
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

      <section className={SECTION}>
        <SectionHeader
          icon={<Flame size={12} />}
          label="Trending"
          extra={
            <Link href="/trending" className="text-[10px] font-bold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
              View all
            </Link>
          }
        />
        <div className="space-y-4">
          {trends.length === 0 && (
            <p className="text-xs italic text-[var(--color-text-muted)]">Warming up...</p>
          )}
          {trends.slice(0, 5).map((trend, i) => (
            <motion.div
              key={`${trend.topic}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 tabular-nums text-[10px] font-black ${
                    i === 0 ? "text-[var(--color-gold)]" : i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                  }`}>
                    #{i + 1}
                  </span>
                  <span className="truncate text-sm font-bold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
                    {trend.topic}
                  </span>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="shrink-0 tabular-nums text-[10px] font-bold text-[var(--color-text-muted)]"
                >
                  {Number(trend.score).toFixed(1)}
                </motion.span>
              </div>
              <TrendBar score={Number(trend.score)} max={maxTrendScore} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <SectionHeader
          icon={<Users size={12} />}
          label="Communities"
          extra={
            <Link href="/communities" className="text-[10px] font-bold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
              View all
            </Link>
          }
        />
        <div className="space-y-1">
          {communities.slice(0, 6).map((c) => {
            const hue = Math.round((1 - Number(c.conflict_score)) * 120);
            return (
              <Link
                key={c.id}
                href="/communities"
                className="-mx-2 flex items-center justify-between rounded-lg p-2 transition-all duration-150 hover:bg-[var(--color-panel)]/60"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white"
                    style={{ background: `hsl(${hue}, 70%, 45%)` }}
                  >
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-sm font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]">
                    {c.name}
                  </span>
                </div>
                <span className="shrink-0 tabular-nums text-[10px] font-bold" style={{ color: `hsl(${hue}, 75%, 58%)` }}>
                  {Number(c.conflict_score).toFixed(1)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
