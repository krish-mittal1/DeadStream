"use client";

import { useMemo } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function SignalField() {
  const agents = useSimulationStore((s) => s.agents);
  const events = useSimulationStore((s) => s.events);

  const nodes = useMemo(() => {
    const source = agents.length ? agents : Array.from({ length: 16 }, (_, index) => ({ id: `seed-${index}`, template: "boot" }));
    return source.slice(0, 34).map((agent, index) => ({
      id: agent.id,
      label: agent.username || agent.template,
      x: 7 + ((index * 31) % 86),
      y: 10 + ((index * 47) % 78),
      size: 5 + ((index * 7) % 12),
      delay: `${(index % 11) * 0.32}s`
    }));
  }, [agents]);

  return (
    <div className="signal-field" aria-hidden="true">
      <div className="signal-scanline" />
      <div className="signal-orbit orbit-a" />
      <div className="signal-orbit orbit-b" />
      {nodes.map((node, index) => (
        <span
          key={node.id}
          className="signal-node"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: `${node.size}px`,
            height: `${node.size}px`,
            animationDelay: node.delay
          }}
          title={node.label}
        />
      ))}
      {events.slice(0, 12).map((event, index) => (
        <span
          key={event.id}
          className="event-comet"
          style={{
            top: `${8 + ((index * 17) % 80)}%`,
            animationDelay: `${index * 0.44}s`
          }}
        />
      ))}
    </div>
  );
}

