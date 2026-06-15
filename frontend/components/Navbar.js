"use client";

import {
  Bell, Bookmark, Bot, Flame, Home,
  LogIn, LogOut, MessageSquare, Moon, Search, Sun, UserPlus, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSimulationStore } from "../store/useSimulationStore";

const avatarGradients = [
  "linear-gradient(135deg,#ff4500,#ff6534)",
  "linear-gradient(135deg,#4f8cff,#9b6cff)",
  "linear-gradient(135deg,#10d48e,#14b8a6)",
  "linear-gradient(135deg,#fb4785,#f5a623)",
  "linear-gradient(135deg,#9b6cff,#4f8cff)",
  "linear-gradient(135deg,#f5a623,#ff4500)",
  "linear-gradient(135deg,#22d3ee,#4f8cff)",
  "linear-gradient(135deg,#2ecc71,#10d48e)",
];

function getAvatarBg(username) {
  const i = username?.split("").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return avatarGradients[i % avatarGradients.length];
}

function SidebarLink({ href, label, icon: Icon, badge, isActive, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
        isActive
          ? "text-white"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      <span className="relative z-10 flex items-center gap-3">
        <span className={`flex items-center justify-center w-5 h-5 transition-all duration-200 ${
          isActive ? "text-[var(--color-accent)]" : ""
        }`}>
          <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
        </span>
        <span>{label}</span>
      </span>
      {badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto badge text-[8px] min-w-[18px] h-[18px]"
        >
          {badge > 9 ? "9+" : badge}
        </motion.span>
      )}
      {isActive && (
        <motion.div
          layoutId="sidebar-pill"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-[rgba(255,69,0,0.12)] to-[rgba(255,69,0,0.04)] border border-[rgba(255,69,0,0.10)]"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
    </Link>
  );
}

function SidebarSection({ label }) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
        {label}
      </span>
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const user = useSimulationStore((s) => s.user);
  const unreadCount = useSimulationStore((s) => s.unreadCount);

  const items = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/trending", label: "Hot", icon: Flame },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
    { href: user ? `/profile/${user.id}` : "/login", label: "Profile", icon: Bot },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center md:hidden"
      style={{
        background: "rgba(7,7,9,0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--color-line)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {items.map(({ href, label, icon: Icon, badge }) => {
        const isActive = pathname.startsWith(href.replace(/\/\d+$/, ""));
        return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all duration-200"
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              className={`relative flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${
                isActive ? "bg-[rgba(255,69,0,0.12)]" : "bg-transparent"
              }`}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}
              />
              {badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="badge absolute -top-1 -right-1 text-[8px]"
                >
                  {badge > 9 ? "9+" : badge}
                </motion.span>
              )}
            </motion.div>
            <span className={`text-[9px] font-bold tracking-wide ${
              isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
            }`}>
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="mobile-indicator"
                className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full bg-[var(--color-accent)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const user = useSimulationStore((s) => s.user);
  const unreadCount = useSimulationStore((s) => s.unreadCount);
  const dmUnread = useSimulationStore((s) => s.dmUnread);
  const theme = useSimulationStore((s) => s.theme);
  const toggleTheme = useSimulationStore((s) => s.toggleTheme);
  const logout = useSimulationStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isLanding = pathname === "/";
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Hide sidebar entirely on auth/landing pages
  if (isLanding || isAuthPage) {
    return (
      <>
        <MobileBottomNav />
        {/* Logo header for auth pages — absolute top-left */}
        {isAuthPage && (
          <div className="fixed top-4 left-4 z-50 flex items-center gap-2.5">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-8 w-8 items-center justify-center rounded-xl shadow-[var(--shadow-accent)]"
              style={{ background: "linear-gradient(135deg, #ff4500, #ff6534)" }}
            >
              <Bot size={17} className="text-white" />
            </motion.div>
            <span className="text-[15px] font-extrabold tracking-tight font-display"
              style={{
                background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.5))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              DeadStream
            </span>
          </div>
        )}
      </>
    );
  }

  const primaryLinks = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/trending", label: "Trending", icon: Flame },
    { href: "/communities", label: "Communities", icon: Users },
    { href: "/dm", label: "Messages", icon: MessageSquare, badge: dmUnread },
  ];

  const secondaryLinks = user
    ? [
        { href: `/profile/${user.id}`, label: "Profile", icon: Bot },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
        { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
      ]
    : [];

  return (
    <>
      <MobileBottomNav />

      {/* ─── Sidebar Content ─── */}
      <div className="flex flex-col h-full py-4 px-3">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 px-3 mb-6 group shrink-0">
          <motion.div
            whileHover={{ scale: 1.12, rotate: -10 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl shadow-[var(--shadow-accent)] group-hover:shadow-[0_0_20px_rgba(255,69,0,0.3)] transition-shadow duration-300"
            style={{ background: "linear-gradient(135deg, #ff4500, #ff6534)" }}
          >
            <Bot size={17} className="text-white" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-[15px] font-extrabold tracking-tight font-display leading-tight"
              style={{
                background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.5))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              DeadStream
            </span>
          </div>
        </Link>

        {/* ── Primary Navigation ── */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <SidebarSection label="Navigate" />
          <div className="space-y-0.5">
            {primaryLinks.map(({ href, label, icon, badge }) => (
              <SidebarLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                badge={badge}
                isActive={pathname.startsWith(href)}
              />
            ))}
          </div>

          {secondaryLinks.length > 0 && (
            <>
              <SidebarSection label="You" />
              <div className="space-y-0.5">
                {secondaryLinks.map(({ href, label, icon, badge }) => (
                  <SidebarLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    badge={badge}
                    isActive={pathname.startsWith(href.replace(/\/\d+$/, ""))}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom Actions ── */}
        <div className="shrink-0 pt-3 mt-2 border-t border-[var(--color-line)] space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="sidebar-nav-item text-sm !gap-3"
          >
            <span className="flex items-center justify-center w-5 h-5">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.div>
            </span>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {/* User area */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-[var(--color-panel)]"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm shrink-0"
                  style={{ background: getAvatarBg(user.username) }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text)] truncate max-w-[140px]">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Member</span>
                </div>
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute bottom-full left-0 mb-2 w-full min-w-[180px] rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-xl)] overflow-hidden z-50"
                  >
                    <div className="p-2">
                      <Link
                        href={`/profile/${user.id}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="sidebar-nav-item text-sm"
                      >
                        <Bot size={15} /> Profile
                      </Link>
                      <Link
                        href="/bookmarks"
                        onClick={() => setUserMenuOpen(false)}
                        className="sidebar-nav-item text-sm"
                      >
                        <Bookmark size={15} /> Saved
                      </Link>
                    </div>
                    <div className="p-2 border-t border-[var(--color-line)]">
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="sidebar-nav-item text-sm text-[var(--color-red)] hover:bg-red-500/8 hover:text-[var(--color-red)] w-full"
                      >
                        <LogOut size={15} /> Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Link href="/login" className="btn-secondary w-full justify-center h-9 text-sm">
                <LogIn size={14} /> Log In
              </Link>
              <Link href="/register" className="btn-primary w-full justify-center h-9 text-sm">
                <UserPlus size={14} /> Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
