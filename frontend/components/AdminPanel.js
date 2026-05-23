"use client";

import { GitFork, ShieldAlert, Zap } from "lucide-react";
import { useMemo } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function AdminPanel() {
  const events = useSimulationStore((s) => s.events);
  const graph = useSimulationStore((s) => s.graph);

  const moderationEvents = useMemo(() => events.filter((e) => e.type === "moderation_actioned"), [events]);
  const replyEvents = useMemo(() => events.filter((e) => e.type.includes("replied")), [events]);
  const memoryEvents = useMemo(() => events.filter((e) => e.type === "memory_updated"), [events]);
  const agentWakeEvents = useMemo(() => events.filter((e) => e.type === "agent_woke"), [events]);

  const eventTypeColors = {
    agent_woke: "var(--accent)",
    agent_slept: "var(--muted)",
    agent_posted: "var(--blue)",
    agent_replied: "var(--violet)",
    agent_liked: "var(--hot)",
    agent_followed: "var(--gold)",
    user_posted: "var(--blue)",
    user_replied: "var(--violet)",
    user_liked: "var(--hot)",
    user_followed_user: "var(--gold)",
    user_registered: "var(--accent)",
    moderation_actioned: "var(--hot)",
    memory_updated: "#666",
  };

  return (
    <div className="admin-grid grid min-h-0 flex-1 grid-cols-1 overflow-auto border-t border-[var(--line)] bg-[#0b0c09] md:grid-cols-3">
      {/* Event Stream */}
      <section className="min-h-64 overflow-auto border-r border-[var(--line)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap size={16} /> Event Stream
          </div>
          <div className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-xs text-[var(--muted)]">
            {events.length} total
          </div>
        </div>
        <div className="scrollbar-thin max-h-[calc(100vh-240px)] space-y-1.5 overflow-auto">
          {events.slice(0, 40).map((event, index) => (
            <div
              key={event.id}
              className="event-row rounded border border-[var(--line)] bg-[var(--panel)] p-2"
              style={{ "--delay": `${index * 25}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="text-xs font-medium"
                  style={{ color: eventTypeColors[event.type] || "var(--muted)" }}
                >
                  {event.type}
                </div>
                <div className="text-[10px] text-[var(--muted)] shrink-0">
                  {event.occurred_at ? new Date(event.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                </div>
              </div>
              {event.payload?.body && (
                <div className="mt-1 truncate text-[11px] text-[var(--muted)]">
                  {String(event.payload.body).slice(0, 80)}
                </div>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-xs text-[var(--muted)]">No events yet...</div>
          )}
        </div>
      </section>

      {/* Influence Network */}
      <section className="min-h-64 border-r border-[var(--line)] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <GitFork size={16} /> Influence Network
        </div>
        <div className="network-map relative h-64 overflow-hidden rounded border border-[var(--line)] bg-[var(--panel)]">
          <div className="map-grid" />
          {/* Render edges as lines using SVG */}
          <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.25 }}>
            {graph.edges.slice(0, 30).map((edge, index) => {
              const sourceNode = graph.nodes.find((n) => n.id === edge.source);
              const targetNode = graph.nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              const si = graph.nodes.indexOf(sourceNode);
              const ti = graph.nodes.indexOf(targetNode);
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={`${8 + ((si * 37) % 82)}%`}
                  y1={`${10 + ((si * 53) % 76)}%`}
                  x2={`${8 + ((ti * 37) % 82)}%`}
                  y2={`${10 + ((ti * 53) % 76)}%`}
                  stroke="var(--accent)"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>
          {graph.nodes.slice(0, 30).map((node, index) => (
            <div
              key={node.id}
              className={`graph-node absolute rounded-full ${node.group === "agent" ? "bg-[var(--accent)]" : "bg-[var(--blue)]"}`}
              style={{
                left: `${8 + ((index * 37) % 82)}%`,
                top: `${10 + ((index * 53) % 76)}%`,
                width: 10,
                height: 10,
                animationDelay: `${index * 0.13}s`,
              }}
              title={`${node.label} (${node.group})`}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" /> agents ({graph.nodes.filter((n) => n.group === "agent").length})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--blue)]" /> humans ({graph.nodes.filter((n) => n.group === "human").length})
          </span>
        </div>
      </section>

      {/* Moderation Pulse */}
      <section className="min-h-64 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert size={16} /> Moderation Pulse
        </div>
        <div className="space-y-3">
          <Metric label="Moderation actions" value={moderationEvents.length} color="var(--hot)" />
          <Metric label="Argument threads" value={replyEvents.length} color="var(--violet)" />
          <Metric label="Agent wake events" value={agentWakeEvents.length} color="var(--accent)" />
          <Metric label="Memory writes" value={memoryEvents.length} color="var(--blue)" />
        </div>

        {/* Event type breakdown */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Event Breakdown</div>
          <div className="space-y-1.5">
            {Object.entries(
              events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span
                    className="shrink-0 text-[10px]"
                    style={{ color: eventTypeColors[type] || "var(--muted)" }}
                  >
                    {type}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--panel-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (count / Math.max(1, events.length)) * 400)}%`,
                        background: eventTypeColors[type] || "var(--muted)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[var(--muted)]">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="metric-tile flex items-center justify-between rounded border border-[var(--line)] bg-[var(--panel)] p-3">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: color || "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}
