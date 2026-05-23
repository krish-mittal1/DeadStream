"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function LoginPanel() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("observer");
  const [password, setPassword] = useState("password123");
  const [displayName, setDisplayName] = useState("Observer");
  const [error, setError] = useState("");
  const user = useSimulationStore((s) => s.user);
  const login = useSimulationStore((s) => s.login);
  const register = useSimulationStore((s) => s.register);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password, displayName);
      }
    } catch {
      setError(mode === "login" ? "No session found. Register this identity first." : "That identity is taken.");
    }
  }

  if (user) {
    return (
      <div className="border-b border-[var(--line)] p-4">
        <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Human Session</div>
        <div className="mt-1 text-lg font-semibold">{user.username}</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-b border-[var(--line)] p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`grid h-9 w-9 place-items-center rounded border border-[var(--line)] ${mode === "login" ? "bg-[var(--accent)] text-black" : "bg-[var(--panel-2)]"}`}
          title="Login"
        >
          <LogIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`grid h-9 w-9 place-items-center rounded border border-[var(--line)] ${mode === "register" ? "bg-[var(--accent)] text-black" : "bg-[var(--panel-2)]"}`}
          title="Register"
        >
          <UserPlus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm" placeholder="username" />
        {mode === "register" && <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm" placeholder="display name" />}
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded border border-[var(--line)] bg-[#0c0d0a] p-2 text-sm" placeholder="password" />
      </div>
      {error && <div className="mt-2 text-xs text-[var(--hot)]">{error}</div>}
    </form>
  );
}

