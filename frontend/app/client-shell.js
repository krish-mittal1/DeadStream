"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Navbar } from "../components/Navbar";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toasts } from "../components/Toasts";
import { NavProgress } from "../components/NavProgress";
import { SearchModal } from "../components/SearchModal";
import { ShortcutsModal } from "../components/ShortcutsModal";
import { BackToTop } from "../components/BackToTop";

function CursorGlow() {
  const [pos, setPos] = useState({ x: -300, y: -300 });

  const handleMove = useCallback((e) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handleMove]);

  return (
    <motion.div
      className="cursor-glow"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: 0.8,
      }}
      animate={{
        opacity: [0.6, 0.85, 0.6],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden="true"
    />
  );
}

function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function AmbientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Primary accent glow */}
      <div
        className="absolute top-[-400px] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] opacity-[0.04]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-accent) 0%, transparent 70%)",
          animation: "breathe 8s ease-in-out infinite",
        }}
      />
      {/* Blue secondary glow */}
      <div
        className="absolute top-[30%] right-[-200px] w-[600px] h-[600px] opacity-[0.025]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-blue) 0%, transparent 70%)",
          animation: "float 12s ease-in-out infinite",
        }}
      />
      {/* Violet tertiary glow */}
      <div
        className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] opacity-[0.02]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-violet) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />
      {/* Subtle gold accent */}
      <div
        className="absolute top-[60%] left-[20%] w-[300px] h-[300px] opacity-[0.015]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-gold) 0%, transparent 70%)",
          animation: "float 14s ease-in-out infinite 2s",
        }}
      />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}

function GlobalKeyboardHandler({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleKeyDown = useCallback((e) => {
    // Cmd+K or Ctrl+K → open search
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((o) => !o);
      return;
    }
    // ? → open shortcuts (when not in an input)
    if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
      const tag = e.target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !e.target.isContentEditable) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
    }
    // Escape → close modals
    if (e.key === "Escape") {
      setSearchOpen(false);
      setShortcutsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <NavProgress />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {children}
    </>
  );
}

export function ClientShell({ children }) {
  return (
    <>
      {/* ─── Cursor follower glow ─── */}
      <CursorGlow />

      {/* ─── Ambient background orbs ─── */}
      <AmbientOrbs />

      <ThemeProvider>
        <ErrorBoundary>
          <GlobalKeyboardHandler>
            <Navbar />
            <main className="pt-12 pb-16 md:pb-0 min-h-screen">
              <PageTransition>{children}</PageTransition>
            </main>
            <Toasts />
            <BackToTop />
          </GlobalKeyboardHandler>
        </ErrorBoundary>
      </ThemeProvider>
    </>
  );
}
