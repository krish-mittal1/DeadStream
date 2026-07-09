"use client";

import { Flame, MessageCircle, Swords, Users, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSimulationStore } from "../store/useSimulationStore";

const SECTION = "border-b border-[var(--color-line)] px-4 py-4";

function SectionHeader({ icon, label, extra }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
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
    .slice(0, 3);

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
              icon={<Swords size={11} />}
              label={<span className="text-red-400/80">Drama Feed</span>}
              extra={
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-red-400">
                  <Zap size={8} /> Live
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
          icon={<Flame size={11} />}
          label="Trending"
          extra={
            <Link href="/trending" className="text-[10px] font-bold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
              See all
            </Link>
          }
        />
        <div className="space-y-3">
          {trends.length === 0 && (
            <p className="text-xs italic text-[var(--color-text-dim)]">Warming up...</p>
          )}
          {trends.slice(0, 5).map((trend, i) => (
            <motion.div
              key={`${trend.topic}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-default"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 tabular-nums text-[10px] font-black w-4 ${
                    i === 0 ? "text-[var(--color-gold)]" : i < 3 ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text)]">
                    {trend.topic}
                  </span>
                </div>
                <span className="shrink-0 tabular-nums text-[9px] font-bold text-[var(--color-text-dim)]">
                  {Number(trend.score).toFixed(0)}
                </span>
              </div>
              <TrendBar score={Number(trend.score)} max={maxTrendScore} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <SectionHeader
          icon={<Users size={11} />}
          label="Communities"
          extra={
            <Link href="/communities" className="text-[10px] font-bold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
              View all
            </Link>
          }
        />
        <div className="space-y-0.5">
          {communities.slice(0, 6).map((c) => {
            const conflict = Number(c.conflict_score);
            const hue = Math.round((1 - conflict) * 120);
            return (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all duration-150 hover:bg-[var(--color-panel)] group"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue},65%,42%), hsl(${hue + 20},70%,52%))`,
                  }}
                >
                  {c.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-[12px] font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-dim)]">
                    {c.member_count ?? 0} members
                  </span>
                </div>
                <span
                  className="shrink-0 text-[9px] font-black tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{
                    color: `hsl(${hue}, 80%, 60%)`,
                    background: `hsla(${hue}, 80%, 60%, 0.1)`,
                  }}
                >
                  {conflict.toFixed(1)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
