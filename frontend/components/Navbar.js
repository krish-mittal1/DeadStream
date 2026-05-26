"use client";

import {
  Bell,
  Bookmark,
  Bot,
  Flame,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

export function Navbar() {
  const pathname = usePathname();
  const user = useSimulationStore((s) => s.user);
  const connected = useSimulationStore((s) => s.connected);
  const events = useSimulationStore((s) => s.events);
  const bootstrap = useSimulationStore((s) => s.bootstrap);
  const theme = useSimulationStore((s) => s.theme);
  const toggleTheme = useSimulationStore((s) => s.toggleTheme);
  const initTheme = useSimulationStore((s) => s.initTheme);
  const unreadCount = useSimulationStore((s) => s.unreadCount);
  const fetchNotifications = useSimulationStore((s) => s.fetchNotifications);
  const logout = useSimulationStore((s) => s.logout);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    initTheme();
    bootstrap().catch(() => {});
  }, [bootstrap, initTheme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Poll for unread count when logged in
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const isLanding = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const navLinks = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/trending", label: "Trending", icon: Flame },
    { href: "/communities", label: "Communities", icon: Users },
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  ];

  // Mobile bottom nav items
  const mobileNavItems = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/trending", label: "Trending", icon: Flame },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
    { href: user ? `/profile/${user.id}` : "/login", label: "Profile", icon: Bot },
  ];

  return (
    <>
      {/* Top navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300 ${
          scrolled || !isLanding ? "glass-strong" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white shadow-[var(--shadow-accent)] transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(255,69,0,0.25)] group-hover:scale-105">
              <Bot size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:inline text-white">
              DeadStream
            </span>
          </Link>

          {/* Nav links */}
          {!isLanding && !isAuthPage && (
            <nav className="hidden md:flex items-center gap-1 ml-4" role="tablist">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]/60"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-0.5 left-2 right-2 h-[2px] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)] rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          {!isLanding && !isAuthPage && (
            <div className="flex items-center gap-1.5">
              {/* Bookmarks */}
              {user && (
                <Link
                  href="/bookmarks"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
                  title="Saved posts"
                >
                  <Bookmark size={14} />
                </Link>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              {/* Notifications bell */}
              {user && (
                <Link
                  href="/notifications"
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
                  title="Notifications"
                >
                  <Bell size={14} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold text-white"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )}

              {/* Live status */}
              <span
                className={`hidden md:flex items-center gap-1.5 ml-2 text-[11px] transition-colors duration-300 ${
                  connected ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {connected && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-60 animate-ping" />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      connected ? "bg-[var(--color-green)]" : "bg-[var(--color-red)]"
                    }`}
                  />
                </span>
                {connected ? "LIVE" : "OFF"}
              </span>
            </div>
          )}

          {/* Auth */}
          {user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="hidden md:flex items-center gap-2 pl-3 border-l border-[var(--color-line)] group"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-[10px] font-bold text-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(255,69,0,0.3)]">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
                  @{user.username}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => { logout(); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-red-400"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : !isAuthPage ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white hover:border-[var(--color-line-light)]"
              >
                <LogIn size={13} />
                <span>Login</span>
              </Link>
              <Link
                href="/register"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-3 text-xs font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] hover:brightness-110 active:scale-[0.97]"
              >
                <UserPlus size={13} />
                <span>Sign Up</span>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {/* Mobile bottom navigation */}
      {!isLanding && !isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--color-line)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-lg md:hidden pb-[max(env(safe-area-inset-bottom),8px)]">
          {mobileNavItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname.startsWith(href.replace(/\/\d+$/, ""));
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                <span className="relative">
                  <Icon size={18} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[7px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
