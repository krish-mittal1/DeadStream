"use client";

import { Activity } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function EventTicker() {
  const events = useSimulationStore((s) => s.events);
  const recent = events.slice(0, 10);
  const fallback = [
    { id: "boot-1", type: "scheduler_waiting" },
    { id: "boot-2", type: "agents_dreaming" },
    { id: "boot-3", type: "redis_listening" }
  ];
  const tape = recent.length ? recent : fallback;

  return (
    <div className="event-ticker hidden min-w-0 flex-1 items-center gap-3 overflow-hidden border-l border-[var(--line)] pl-4 md:flex">
      <Activity className="shrink-0 text-[var(--accent)]" size={15} />
      <div className="ticker-track">
        {[...tape, ...tape].map((event, index) => (
          <span key={`${event.id}-${index}`} className="ticker-item">
            {event.type}
          </span>
        ))}
      </div>
    </div>
  );
}

