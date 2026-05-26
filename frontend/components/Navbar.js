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

const avatarGradients = [
  "from-orange-500 to-red-500",
  "from-blue-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-amber-500 to-yellow-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-green-500",
];

function getAvatarColor(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

export function Navbar() {
  const pathname = usePathname();
  const user = useSimulationStore((s) => s.user);
  const connected = useSimulationStore((s) => s.connected);
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

  const mobileNavItems = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/trending", label: "Trending", icon: Flame },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
    { href: user ? `/profile/${user.id}` : "/login", label: "Profile", icon: Bot },
  ];

  return (
    <>
      {/* ─── Top navbar ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300 ${
          scrolled || !isLanding
            ? "bg-[var(--color-bg-secondary)]/85 backdrop-blur-2xl shadow-[0_1px_0_var(--color-line)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={{ scale: 1.08, rotate: -5 }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-white shadow-[0_0_16px_rgba(255,69,0,0.15)]"
            >
              <Bot size={16} />
            </motion.div>
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
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "text-white bg-white/5"
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

          {/* Right actions */}
          {!isLanding && !isAuthPage && (
            <div className="flex items-center gap-1">
              {/* Bookmarks */}
              {user && (
                <Link
                  href="/bookmarks"
                  className="btn-icon"
                  title="Saved posts"
                >
                  <Bookmark size={14} />
                </Link>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="btn-icon"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                </motion.div>
              </button>

              {/* Notifications */}
              {user && (
                <Link
                  href="/notifications"
                  className="btn-icon relative"
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
                className={`hidden md:flex items-center gap-1.5 ml-2 text-[11px] font-semibold tracking-wider ${
                  connected ? "live-dot online" : "live-dot offline"
                }`}
              >
                {connected ? "LIVE" : "OFF"}
              </span>
            </div>
          )}

          {/* Auth area */}
          {user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="hidden md:flex items-center gap-2 pl-3 border-l border-[var(--color-line)] group"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} text-[10px] font-bold text-white shadow-sm transition-shadow duration-200 group-hover:shadow-[0_0_12px_rgba(255,69,0,0.25)]`}
                >
                  {user.username[0].toUpperCase()}
                </motion.div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
                  @{user.username}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => { logout(); }}
                className="btn-icon hover:text-red-400"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </>
          ) : !isAuthPage ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="btn-secondary h-8 text-xs px-3"
              >
                <LogIn size={13} />
                <span>Login</span>
              </Link>
              <Link
                href="/register"
                className="btn-primary h-8 text-xs px-3"
              >
                <UserPlus size={13} />
                <span>Sign Up</span>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {/* ─── Mobile bottom navigation ─── */}
      {!isLanding && !isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--color-line)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl md:hidden pb-[max(env(safe-area-inset-bottom),8px)]">
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
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[7px] font-bold text-white"
                    >
                      {badge > 9 ? "9+" : badge}
                    </motion.span>
                  )}
                </span>
                <span>{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-indicator"
                    className="absolute -top-[1px] left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold)] rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
