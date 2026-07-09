"use client";

import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
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

function isHighFrequencyRoute(pathname) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/feed") ||
    pathname.startsWith("/post") ||
    pathname.startsWith("/profile")
  );
}

function PageTransition({ children }) {
  const pathname = usePathname();
  const dirRef = useRef("forward");
  const prevPathRef = useRef(pathname);

  // Soften transitions on high-frequency routes (feed ↔ post ↔ profile)
  if (isHighFrequencyRoute(pathname) && isHighFrequencyRoute(prevPathRef.current)) {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
    }
    return <>{children}</>;
  }

  // Detect navigation direction by comparing pathname hierarchies
  if (prevPathRef.current !== pathname) {
    const prev = prevPathRef.current;
    const curr = pathname;
    const prevDepth = prev.split("/").filter(Boolean).length;
    const currDepth = curr.split("/").filter(Boolean).length;

    if (
      currDepth < prevDepth ||
      (currDepth === prevDepth && curr < prev)
    ) {
      dirRef.current = "back";
    } else {
      dirRef.current = "forward";
    }
    prevPathRef.current = pathname;
  }

  const direction = dirRef.current;

  const slideLeft = { x: 40, opacity: 0 };
  const slideRight = { x: -40, opacity: 0 };
  const center = { x: 0, opacity: 1 };

  const variants = {
    forward: { initial: slideLeft, exit: { x: -30, opacity: 0 } },
    back: { initial: slideRight, exit: { x: 30, opacity: 0 } },
  };

  const v = variants[direction];

  return (
    <motion.div
      key={pathname}
      custom={direction}
      initial={v.initial}
      animate={center}
      transition={{
        x: { type: "spring", stiffness: 380, damping: 35 },
        opacity: { duration: 0.2 },
      }}
    >
      {children}
    </motion.div>
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

  useEffect(() => {
    const openFromUi = () => setSearchOpen(true);
    window.addEventListener("deadstream:open-search", openFromUi);
    return () => window.removeEventListener("deadstream:open-search", openFromUi);
  }, []);

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
  if (pathname === "/") return true;
  return false;
}

function useMainShellClass(pathname) {
  if (!pathname) return "";
  if (pathname.startsWith("/dm")) return " chat-shell";
  if (pathname.startsWith("/communities") || pathname.startsWith("/trending")) return " directory-shell";
  if (pathname.startsWith("/admin") || pathname === "/") return " full-width";
  if (pathname.startsWith("/feed") || pathname.startsWith("/post") || pathname.startsWith("/profile")) return " feed-shell";
  return "";
}

/* ─── Panel error dismissible banner ──────────────────────── */
function PanelErrorBanner() {
  const panelError = useSimulationStore((s) => s.panelError);
  const setPanelError = useCallback(() => useSimulationStore.setState({ panelError: "" }), []);
  if (!panelError) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 shadow-lg backdrop-blur-md max-w-sm w-[90vw]"
    >
      <AlertTriangle size={15} className="text-red-400 shrink-0" />
      <p className="flex-1 text-[12px] font-medium text-red-300">{panelError}</p>
      <button onClick={setPanelError} className="btn-icon w-6 h-6 shrink-0 text-red-400 hover:text-red-200">
        <X size={12} />
      </button>
    </motion.div>
  );
}

export function ClientShell({ children }) {
  const pathname = usePathname();
  const bootstrap = useSimulationStore((s) => s.bootstrap);
  const showRail = useShowRail(pathname);
  const fullWidth = useFullWidth(pathname);
  const shellClass = useMainShellClass(pathname);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isLanding = pathname === "/";

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

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
                <main className={`app-main-content scrollbar-thin${shellClass}`} data-scroll-container
                  style={fullWidth ? { maxWidth: "100%" } : isAuthPage || isLanding ? { maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center" } : {}}>
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>

              {/* ─── Right Rail (contextual) ─── */}
              <aside className={`app-rail${showRail ? "" : " hidden"}`}>
                {showRail && <RightRail />}
              </aside>

            </div>

            <PanelErrorBanner />
            <Toasts />
            <BackToTop />
          </GlobalKeyboardHandler>
        </ErrorBoundary>
      </ThemeProvider>
    </>
  );
}
