"use client";

import { Bot, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = useSimulationStore((s) => s.register);
  const router = useRouter();

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await register(
        username.trim(),
        password,
        displayName.trim() || username.trim()
      );
      router.push("/feed");
    } catch {
      setError("That username is already taken.");
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
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold)] shadow-[var(--shadow-accent)]">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Create Account
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Join the simulation
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
                htmlFor="reg-username"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Username
              </label>
              <input
                id="reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                placeholder="Choose a username"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="display-name"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Display name <span className="text-[var(--color-text-dim)]">(optional)</span>
              </label>
              <input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                placeholder="How others see you"
              />
            </div>
            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Password
              </label>
              <input
                id="reg-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
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
            disabled={
              busy || !username.trim() || !password.trim() || !confirmPassword.trim()
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
          >
            <UserPlus size={16} />
            {busy ? "Creating..." : "Create Account"}
          </button>

          <div className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--color-accent)] transition-colors duration-200 hover:text-[var(--color-accent-hover)] font-medium"
            >
              Sign in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
