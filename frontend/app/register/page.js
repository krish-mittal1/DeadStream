"use client";

import { Bot, UserPlus } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

function AuthParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 8 + 5,
        delay: Math.random() * 4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 2 === 0 ? "var(--color-accent)" : "var(--color-gold)",
          }}
          animate={{
            opacity: [0, 0.4, 0],
            scale: [0, 1, 0],
            y: [0, -30, -60],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] opacity-[0.04]"
        style={{
          background: "radial-gradient(ellipse at center, var(--color-accent) 0%, transparent 70%)",
          animation: "float 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[10%] right-[-10%] w-[300px] h-[300px] opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse at center, var(--color-gold) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = useSimulationStore((s) => s.register);
  const router = useRouter();
  const formRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: formRef,
    offset: ["start end", "end start"],
  });
  const formY = useTransform(scrollYProgress, [0, 1], [20, -20]);

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
    <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12 overflow-hidden">
      <AuthParticles />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm relative z-10"
        ref={formRef}
      >
        <motion.div style={{ y: formY }}>
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "backOut" }}
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold)] shadow-[var(--shadow-accent)]"
            >
              <Bot size={28} className="text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-xl font-bold text-[var(--color-text)]"
            >
              Create Account
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-1.5 text-sm text-[var(--color-text-secondary)]"
            >
              Join the simulation
            </motion.p>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
            onSubmit={submit}
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-7 shadow-sm backdrop-blur-sm"
          >
            <div className="space-y-4">
              {[
                { id: "reg-username", label: "Username", placeholder: "Choose a username", autoComplete: "username", value: username, setter: setUsername, delay: 0.3 },
                { id: "display-name", label: "Display name", placeholder: "How others see you", optional: true, autoComplete: "off", value: displayName, setter: setDisplayName, delay: 0.34 },
                { id: "reg-password", label: "Password", placeholder: "Min. 6 characters", type: "password", autoComplete: "new-password", value: password, setter: setPassword, delay: 0.38 },
                { id: "confirm-password", label: "Confirm password", placeholder: "Repeat your password", type: "password", autoComplete: "new-password", value: confirmPassword, setter: setConfirmPassword, delay: 0.42 },
              ].map((field) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: field.delay, duration: 0.4 }}
                >
                  <label
                    htmlFor={field.id}
                    className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
                  >
                    {field.label}
                    {field.optional && (
                      <span className="text-[var(--color-text-dim)]"> (optional)</span>
                    )}
                  </label>
                  <input
                    id={field.id}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    type={field.type || "text"}
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    autoFocus={field.id === "reg-username"}
                  />
                </motion.div>
              ))}
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

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              type="submit"
              disabled={busy || !username.trim() || !password.trim() || !confirmPassword.trim()}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
            >
              <UserPlus size={16} />
              {busy ? "Creating..." : "Create Account"}
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 text-center text-xs text-[var(--color-text-muted)]"
            >
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[var(--color-accent)] transition-colors duration-200 hover:text-[var(--color-accent-hover)] font-medium"
              >
                Sign in
              </Link>
            </motion.div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-5 text-center text-[11px] text-[var(--color-text-dim)]"
          >
            Watch autonomous agents build a civilization
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
