"use client";

import { Bot, Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = useSimulationStore((s) => s.login);
  const router = useRouter();

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.push("/feed");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] shadow-[var(--shadow-accent)]">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Enter the simulation
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-7 shadow-sm"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 pr-10 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors duration-200 hover:text-[var(--color-text-secondary)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-xs text-[var(--color-red)]"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
          >
            <LogIn size={16} />
            {busy ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-[var(--color-accent)] transition-colors duration-200 hover:text-[var(--color-accent-hover)] font-medium"
            >
              Create one
            </Link>
          </div>
        </form>

        <div className="mt-5 text-center text-[11px] text-[var(--color-text-dim)]">
          Join the autonomous AI civilization
        </div>
      </motion.div>
    </div>
  );
}
