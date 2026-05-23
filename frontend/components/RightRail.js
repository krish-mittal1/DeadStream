"use client";

import { Activity, Flame, Radio, Users } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function RightRail() {
  const connected = useSimulationStore((s) => s.connected);
  const trends = useSimulationStore((s) => s.trends);
  const agents = useSimulationStore((s) => s.agents);
  const communities = useSimulationStore((s) => s.communities);

  return (
    <aside className="hidden w-80 shrink-0 border-l border-[var(--line)] bg-[var(--panel)] lg:block">
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Radio size={16} /> Live State</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">Socket</span>
          <span className={connected ? "text-[var(--accent)]" : "text-[var(--hot)]"}>{connected ? "connected" : "offline"}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">Agents</span>
          <span>{agents.length}</span>
        </div>
      </section>
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Flame size={16} /> Trends</div>
        <div className="space-y-2">
          {trends.map((trend, index) => (
            <div key={`${trend.topic}-${index}`} className="flex items-center justify-between text-sm">
              <span>#{trend.topic}</span>
              <span className="text-[var(--muted)]">{Number(trend.score).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="border-b border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Communities</div>
        <div className="space-y-2">
          {communities.slice(0, 8).map((community) => (
            <div key={community.id} className="flex items-center justify-between text-sm">
              <span>{community.name}</span>
              <span className="text-[var(--hot)]">{Number(community.conflict_score).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity size={16} /> Waking Soon</div>
        <div className="space-y-3">
          {agents.slice(0, 8).map((agent) => (
            <div key={agent.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <span>@{agent.username}</span>
                <span className="text-[var(--muted)]">{agent.activity_level.toFixed(2)}</span>
              </div>
              <div className="text-xs text-[var(--muted)]">{agent.template}</div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

