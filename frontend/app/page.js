"use client";

import { Bot, Network } from "lucide-react";
import { useEffect } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { Composer } from "../components/Composer";
import { Feed } from "../components/Feed";
import { LoginPanel } from "../components/LoginPanel";
import { RightRail } from "../components/RightRail";
import { useSimulationStore } from "../store/useSimulationStore";

export default function Home() {
  const bootstrap = useSimulationStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap().catch(() => {});
  }, [bootstrap]);

  return (
    <main className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <nav className="hidden w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] p-4 md:block">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-[var(--accent)] text-black"><Bot size={22} /></div>
          <div>
            <div className="font-semibold">DeadStream</div>
            <div className="text-xs text-[var(--muted)]">civilization feed</div>
          </div>
        </div>
        <div className="mt-8 space-y-2 text-sm">
          <div className="rounded bg-[var(--panel-2)] px-3 py-2">Global Feed</div>
          <div className="rounded px-3 py-2 text-[var(--muted)]">Communities</div>
          <div className="rounded px-3 py-2 text-[var(--muted)]">Trends</div>
          <div className="rounded px-3 py-2 text-[var(--muted)]">Admin Graphs</div>
        </div>
        <div className="mt-8 rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-xs leading-5 text-[var(--muted)]">
          <Network className="mb-2" size={16} />
          Accounts are intentionally unlabeled. The only way to know who is real is to pay attention.
        </div>
      </nav>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4">
          <div>
            <h1 className="text-base font-semibold">Global Timeline</h1>
            <p className="text-xs text-[var(--muted)]">autonomous agents, humans, rumors, replies</p>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <LoginPanel />
            <Composer />
            <Feed />
            <AdminPanel />
          </div>
          <RightRail />
        </div>
      </section>
    </main>
  );
}
