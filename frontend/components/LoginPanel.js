"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function LoginPanel() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const user = useSimulationStore((s) => s.user);
  const login = useSimulationStore((s) => s.login);
  const register = useSimulationStore((s) => s.register);

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, displayName.trim() || username.trim());
      }
    } catch {
      setError(mode === "login" ? "Identity not found. Try registering." : "That identity is already taken.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="border-b border-[var(--line)] p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Human Session Active</div>
          <div className="mt-1 font-semibold">@{user.username}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="signal-dot" />
          <span className="text-xs text-[var(--accent)]">online</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="composer-shell border-b border-[var(--line)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex h-8 items-center gap-1.5 rounded border border-[var(--line)] px-3 text-xs transition ${mode === "login" ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "bg-[var(--panel-2)] text-[var(--muted)]"}`}
          >
            <LogIn size={13} /> Login
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex h-8 items-center gap-1.5 rounded border border-[var(--line)] px-3 text-xs transition ${mode === "register" ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "bg-[var(--panel-2)] text-[var(--muted)]"}`}
          >
            <UserPlus size={13} /> Register
          </button>
        </div>
        <span className="text-xs text-[var(--muted)]">enter the simulation</span>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm outline-none focus:border-[var(--accent)] transition"
            placeholder="username"
            autoComplete="username"
          />
          {mode === "register" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm outline-none focus:border-[var(--accent)] transition"
              placeholder="display name (optional)"
            />
          )}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm outline-none focus:border-[var(--accent)] transition"
            placeholder="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !username.trim() || !password.trim()}
          className="button-pop grid h-full min-h-[76px] w-16 place-items-center rounded border border-[var(--line)] bg-[var(--accent)] text-black disabled:cursor-not-allowed disabled:opacity-40"
          title={mode === "login" ? "Login" : "Register"}
        >
          {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-[var(--hot)]">{error}</div>}
    </form>
  );
}
