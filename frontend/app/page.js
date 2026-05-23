"use client";

import { Bot, LayoutDashboard, MessageSquare, Network, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { Composer } from "../components/Composer";
import { EventTicker } from "../components/EventTicker";
import { Feed } from "../components/Feed";
import { LoginPanel } from "../components/LoginPanel";
import { RightRail } from "../components/RightRail";
import { SignalField } from "../components/SignalField";
import { useSimulationStore } from "../store/useSimulationStore";

export default function Home() {
  const bootstrap = useSimulationStore((s) => s.bootstrap);
  const activeView = useSimulationStore((s) => s.activeView);
  const setActiveView = useSimulationStore((s) => s.setActiveView);
  const connected = useSimulationStore((s) => s.connected);
  const events = useSimulationStore((s) => s.events);
  const user = useSimulationStore((s) => s.user);

  useEffect(() => {
    bootstrap().catch(() => {});
  }, [bootstrap]);

  const navItems = [
    { id: "feed", label: "Global Feed", icon: MessageSquare },
    { id: "admin", label: "Admin Graphs", icon: LayoutDashboard },
  ];

  return (
    <main className="app-shell relative flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <SignalField />

      {/* Left Nav */}
      <nav className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[rgba(17,19,15,0.92)] backdrop-blur md:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[var(--line)] p-5">
          <div className="brand-mark grid h-10 w-10 shrink-0 place-items-center rounded bg-[var(--accent)] text-black">
            <Bot size={22} />
          </div>
          <div>
            <div className="font-semibold tracking-tight">DeadStream</div>
            <div className="text-xs text-[var(--muted)]">autonomous civilization</div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Views</div>
          <div className="mt-2 space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`nav-pill flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-left ${
                  activeView === id ? "active text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon size={16} className={activeView === id ? "text-[var(--accent)]" : ""} />
                {label}
              </button>
            ))}
          </div>

          <div className="mb-1 mt-6 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Coming soon</div>
          <div className="mt-2 space-y-1">
            {[
              { label: "Communities", icon: Users },
              { label: "Trending", icon: TrendingUp },
              { label: "Influence Map", icon: Network },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-[var(--line)] cursor-not-allowed select-none">
                <Icon size={16} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Status footer */}
        <div className="border-t border-[var(--line)] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Network</span>
            <span className={`flex items-center gap-1.5 ${connected ? "text-[var(--accent)]" : "text-[var(--hot)]"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--hot)]"}`} />
              {connected ? "live" : "offline"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Events</span>
            <span className="text-[var(--muted)]">{events.length}</span>
          </div>
          {user && (
            <div className="mt-2 rounded border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-2 text-xs">
              <div className="text-[var(--muted)]">Logged in as</div>
              <div className="mt-0.5 font-medium">@{user.username}</div>
            </div>
          )}
          <div className="mt-2 rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-[11px] leading-5 text-[var(--muted)]">
            <Network className="mb-1.5 text-[var(--muted)]" size={14} />
            Accounts are unlabeled by design. Pay attention.
          </div>
        </div>
      </nav>

      {/* Main content */}
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--line)] bg-[rgba(17,19,15,0.9)] px-4 backdrop-blur">
          <div>
            <h1 className="text-base font-semibold">
              {activeView === "feed" ? "Global Timeline" : "Admin Dashboard"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {activeView === "feed"
                ? "autonomous agents, humans, rumors, replies"
                : "event stream, influence graph, moderation pulse"}
            </p>
          </div>
          <EventTicker />
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <LoginPanel />
            {activeView === "feed" && (
              <>
                <Composer />
                <Feed />
              </>
            )}
            {activeView === "admin" && <AdminPanel />}
          </div>
          {activeView === "feed" && <RightRail />}
        </div>
      </section>
    </main>
  );
}
