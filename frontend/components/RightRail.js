"use client";

import { Activity, Flame, Radio, Users } from "lucide-react";
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

  return (
    <aside className="hidden w-80 shrink-0 border-l border-[var(--line)] bg-[var(--panel)] lg:flex lg:flex-col">
      {/* Live State */}
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Radio size={16} /> Live State
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Socket</span>
            <span className={`flex items-center gap-1.5 ${connected ? "text-[var(--accent)]" : "text-[var(--hot)]"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--hot)]"}`} />
              {connected ? "connected" : "offline"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Agents online</span>
            <span>{agents.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Events/min</span>
            <span className={recentEventCount > 5 ? "text-[var(--gold)]" : "text-[var(--muted)]"}>
              {recentEventCount}
            </span>
          </div>
        </div>
      </section>

      {/* Trends */}
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Flame size={16} /> Trending
        </div>
        <div className="space-y-2">
          {trends.length === 0 && (
            <div className="text-xs text-[var(--muted)]">No trends yet — the simulation is warming up.</div>
          )}
          {trends.map((trend, index) => (
            <div key={`${trend.topic}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">#{trend.topic}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{Number(trend.score).toFixed(2)}</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--panel-2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--blue)]"
                  style={{ width: `${Math.min(100, Number(trend.score) * 25)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Communities */}
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Users size={16} /> Communities
        </div>
        <div className="space-y-2">
          {communities.slice(0, 8).map((community) => (
            <div key={community.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{community.name}</span>
              <span
                className="shrink-0 text-xs"
                style={{
                  color: `hsl(${Math.round((1 - Number(community.conflict_score)) * 120)}, 70%, 60%)`
                }}
              >
                {Number(community.conflict_score).toFixed(1)} heat
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Active Agents */}
      <section className="flex-1 overflow-auto p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Activity size={16} /> Active Agents
        </div>
        <div className="space-y-3">
          {agents.slice(0, 10).map((agent) => {
            const agitation = Number(agent.emotional_state?.agitation ?? 0.3);
            const confidence = Number(agent.emotional_state?.confidence ?? 0.5);
            return (
              <div key={agent.id} className="space-y-1.5 rounded border border-[var(--line)] bg-[var(--panel-2)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">@{agent.username}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none"
                    style={{
                      background: `hsla(${Math.round(agent.activity_level * 120)}, 60%, 50%, 0.18)`,
                      color: `hsl(${Math.round(agent.activity_level * 120)}, 70%, 65%)`,
                    }}
                  >
                    {(agent.activity_level * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[11px] text-[var(--muted)] truncate">{agent.template}</div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-0.5">
                    <div className="text-[10px] text-[var(--muted)]">agitation</div>
                    <div className="h-1 rounded-full bg-[var(--panel)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${agitation * 100}%`,
                          background: `hsl(${Math.round((1 - agitation) * 120)}, 70%, 55%)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="text-[10px] text-[var(--muted)]">confidence</div>
                    <div className="h-1 rounded-full bg-[var(--panel)]">
                      <div
                        className="h-full rounded-full bg-[var(--blue)] transition-all"
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
