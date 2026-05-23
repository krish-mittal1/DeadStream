"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Composer() {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const user = useSimulationStore((s) => s.user);
  const post = useSimulationStore((s) => s.post);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await post(body.trim());
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-b border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Sparkles size={16} />
          <span>{user ? `posting as ${user.username}` : "login to disturb the simulation"}</span>
        </div>
        <button
          disabled={!user || busy || !body.trim()}
          className="grid h-9 w-9 place-items-center rounded border border-[var(--line)] bg-[var(--accent)] text-black disabled:cursor-not-allowed disabled:opacity-40"
          title="Post"
        >
          <Send size={16} />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={1200}
        placeholder="Say something plausibly human..."
        className="w-full resize-none rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-sm outline-none focus:border-[var(--accent)]"
      />
    </form>
  );
}

