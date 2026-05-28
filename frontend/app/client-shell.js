"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Navbar } from "../components/Navbar";
import { RightRail } from "../components/RightRail";
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
      style={{ left: pos.x, top: pos.y, opacity: 0.8 }}
      animate={{ opacity: [0.6, 0.85, 0.6], scale: [1, 1.05, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

function AmbientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute top-[-400px] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse at center, var(--color-accent) 0%, transparent 70%)", animation: "breathe 8s ease-in-out infinite" }} />
      <div className="absolute top-[30%] right-[-200px] w-[600px] h-[600px] opacity-[0.025]"
        style={{ background: "radial-gradient(ellipse at center, var(--color-blue) 0%, transparent 70%)", animation: "float 12s ease-in-out infinite" }} />
      <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] opacity-[0.02]"
        style={{ background: "radial-gradient(ellipse at center, var(--color-violet) 0%, transparent 70%)", animation: "float 10s ease-in-out infinite reverse" }} />
      <div className="absolute top-[60%] left-[20%] w-[300px] h-[300px] opacity-[0.015]"
        style={{ background: "radial-gradient(ellipse at center, var(--color-gold) 0%, transparent 70%)", animation: "float 14s ease-in-out infinite 2s" }} />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
    </div>
  );
}

function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function GlobalKeyboardHandler({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((o) => !o);
      return;
    }
    if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
      const tag = e.target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !e.target.isContentEditable) {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
    }
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

/**
 * Determine whether to show the right rail based on the current route.
 * Core feed-related pages show it; admin, chat, auth, and landing pages hide it.
 */
function useShowRail(pathname) {
  if (!pathname) return false;
  if (pathname === "/") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/dm")) return false;
  if (pathname.startsWith("/group-chats")) return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return false;
  return true;
}

/**
 * Determine whether the main content area should be "wide" (no side rail constraint).
 * Admin and chat pages need more horizontal space.
 */
function useFullWidth(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/dm")) return true;
  if (pathname.startsWith("/group-chats")) return true;
  if (pathname === "/") return true;
  return false;
}

export function ClientShell({ children }) {
  const pathname = usePathname();
  const showRail = useShowRail(pathname);
  const fullWidth = useFullWidth(pathname);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isLanding = pathname === "/";

  return (
    <>
      <CursorGlow />
      <AmbientOrbs />

      <ThemeProvider>
        <ErrorBoundary>
          <GlobalKeyboardHandler>

            {/* ─── 3-Column App Layout ─── */}
            <div className="app-layout">

              {/* ─── Left Sidebar ─── */}
              <aside className="app-sidebar">
                <Navbar />
              </aside>

              {/* ─── Main Content Area ─── */}
              <div className="app-main">
                <main className="app-main-content scrollbar-thin"
                  style={fullWidth ? { maxWidth: "100%" } : isAuthPage || isLanding ? { maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center" } : {}}>
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>

              {/* ─── Right Rail (contextual) ─── */}
              <aside className={`app-rail${showRail ? "" : " hidden"}`}>
                {showRail && <RightRail />}
              </aside>

            </div>

            <Toasts />
            <BackToTop />
          </GlobalKeyboardHandler>
        </ErrorBoundary>
      </ThemeProvider>
    </>
  );
}
