"use client";

import { GitFork, ShieldAlert, Zap } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function AdminPanel() {
  const events = useSimulationStore((s) => s.events);
  const graph = useSimulationStore((s) => s.graph);

  return (
    <div className="grid min-h-0 grid-cols-1 border-t border-[var(--line)] bg-[#0b0c09] md:grid-cols-3">
      <section className="min-h-64 border-r border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Zap size={16} /> Event Stream</div>
        <div className="scrollbar-thin max-h-64 space-y-2 overflow-auto text-xs">
          {events.slice(0, 28).map((event) => (
            <div key={event.id} className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
              <div className="text-[var(--accent)]">{event.type}</div>
              <div className="truncate text-[var(--muted)]">{event.correlation_id}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="min-h-64 border-r border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><GitFork size={16} /> Influence Network</div>
        <div className="relative h-56 overflow-hidden rounded border border-[var(--line)] bg-[var(--panel)]">
          {graph.nodes.slice(0, 28).map((node, index) => (
            <div
              key={node.id}
              className={`absolute h-3 w-3 rounded-full ${node.group === "agent" ? "bg-[var(--accent)]" : "bg-[var(--blue)]"}`}
              style={{ left: `${8 + ((index * 37) % 82)}%`, top: `${10 + ((index * 53) % 76)}%` }}
              title={node.label}
            />
          ))}
        </div>
      </section>
      <section className="min-h-64 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={16} /> Moderation Pulse</div>
        <div className="space-y-3 text-sm">
          <Metric label="Cooldown risk" value={events.filter((e) => e.type === "moderation_actioned").length} />
          <Metric label="Arguments" value={events.filter((e) => e.type.includes("replied")).length} />
          <Metric label="Memory writes" value={events.filter((e) => e.type === "memory_updated").length} />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--panel)] p-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

