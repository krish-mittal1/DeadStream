"use client";

import {
  Bell, Bookmark, Bot, Flame, Home, LayoutDashboard,
  LogIn, LogOut, MessageSquare, Moon, Search, Sun, UserPlus, Users, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
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

function NavLink({ href, label, icon: Icon, isActive }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
        isActive
          ? "text-white bg-white/8"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-panel)]"
      }`}
    >
      <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-white/5 border border-white/8"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
    </Link>
  );
}

function SearchBar() {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className={`search-bar flex-1 max-w-xs transition-all duration-300 ${
        focused ? "max-w-md" : ""
      }`}
    >
      <Search size={14} className="text-[var(--color-text-muted)] shrink-0" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search DeadStream"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="text-sm"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setValue("")}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0"
          >
            <X size={13} />
          </motion.button>
        )}
      </AnimatePresence>
      {!focused && !value && (
        <span className="text-[10px] text-[var(--color-text-dim)] font-medium border border-[var(--color-line)] rounded px-1 py-0.5 shrink-0 hidden lg:block">
          ⌘K
        </span>
      )}
    </div>
  );
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => { initTheme(); bootstrap().catch(() => {}); }, [bootstrap, initTheme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30000);
    return () => clearInterval(iv);
  }, [user, fetchNotifications]);

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

  const navLinks = [
    { href: "/feed",        label: "Feed",       icon: Home },
    { href: "/trending",    label: "Trending",   icon: Flame },
    { href: "/communities", label: "Communities",icon: Users },
    { href: "/group-chats", label: "Roundtables", icon: MessageSquare },
    { href: "/admin",       label: "Dashboard",  icon: LayoutDashboard },
  ];

  const mobileNavItems = [
    { href: "/feed",        label: "Feed",    icon: Home },
    { href: "/trending",    label: "Hot",     icon: Flame },
    { href: "/notifications",label: "Alerts", icon: Bell, badge: unreadCount },
    { href: user ? `/profile/${user.id}` : "/login", label: "Profile", icon: Bot },
  ];

  return (
    <>
      {/* ─── Top navbar ─── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ height: "var(--nav-height)" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isLanding
            ? "glass-strong shadow-[0_1px_0_var(--color-line)]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-4 lg:px-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group mr-2">              <motion.div
                whileHover={{ scale: 1.12, rotate: -10 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="flex h-8 w-8 items-center justify-center rounded-xl shadow-[var(--shadow-accent)] group-hover:shadow-[0_0_20px_rgba(255,69,0,0.3)] transition-shadow duration-300"
                style={{ background: "linear-gradient(135deg, #ff4500, #ff6534)" }}
              >
                <Bot size={17} className="text-white" />
              </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[15px] font-extrabold tracking-tight hidden sm:inline font-display"
              style={{
                background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.5))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              DeadStream
            </motion.span>
          </Link>

          {/* ── Nav links (desktop) ── */}
          {!isLanding && !isAuthPage && (
            <nav className="hidden md:flex items-center gap-0.5 mr-2">
              {navLinks.map(({ href, label, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  isActive={pathname.startsWith(href)}
                />
              ))}
            </nav>
          )}

          {/* ── Search bar ── */}
          {!isLanding && !isAuthPage && (
            <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm">
              <SearchBar />
            </div>
          )}

          <div className="flex-1" />

          {/* ── Right side ── */}
          {!isLanding && !isAuthPage && (
            <div className="flex items-center gap-1">
              {/* Connection status */}
              <div className={`hidden md:flex items-center gap-1.5 mr-1 px-2.5 py-1 rounded-full border ${
                connected
                  ? "border-[rgba(46,204,113,0.2)] bg-[rgba(46,204,113,0.06)]"
                  : "border-[var(--color-line)] bg-transparent"
              }`}>
                <span className="relative flex h-1.5 w-1.5">
                  {connected && (
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-50 animate-ping" />
                  )}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    connected ? "bg-[var(--color-green)]" : "bg-[var(--color-text-dim)]"
                  }`} />
                </span>
                <span className={`text-[10px] font-bold tracking-wide uppercase ${
                  connected ? "text-[var(--color-green)]" : "text-[var(--color-text-dim)]"
                }`}>
                  {connected ? "Live" : "Off"}
                </span>
              </div>

              {/* Bookmarks */}
              {user && (
                <Link href="/bookmarks" className="btn-icon" title="Saved">
                  <Bookmark size={16} />
                </Link>
              )}

              {/* Notifications */}
              {user && (
                <Link href="/notifications" className="btn-icon relative" title="Notifications">
                  <Bell size={16} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="badge absolute -top-0.5 -right-0.5"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )}

              {/* Theme toggle */}
              <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </motion.div>
              </button>
            </div>
          )}

          {/* ── Auth area ── */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setUserMenuOpen((o) => !o)}
                className="hidden md:flex items-center gap-2 pl-3 border-l border-[var(--color-line)] group"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm"
                  style={{ background: getAvatarBg(user.username) }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] transition-colors">
                  {user.username}
                </span>
              </motion.button>

              {/* User dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-xl)] overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-[var(--color-line)]">
                      <p className="text-sm font-bold text-[var(--color-text)]">{user.username}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">DeadStream member</p>
                    </div>
                    <div className="p-2">
          <Link
            href={`/profile/${user.id}`}
            onClick={() => setUserMenuOpen(false)}
            className="sidebar-nav-item text-sm group/profile"
          >
            <motion.span whileHover={{ rotate: -8 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <Bot size={15} />
            </motion.span>
            Profile
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
          ) : !isAuthPage ? (
            <div className="hidden md:flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link href="/login" className="btn-secondary h-8 text-sm px-4">
                  <LogIn size={14} /> Log In
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(255,69,0,0.28)" }} whileTap={{ scale: 0.96 }}>
                <Link href="/register" className="btn-primary h-8 text-sm px-4">
                  <UserPlus size={14} /> Sign Up
                </Link>
              </motion.div>
            </div>
          ) : null}
        </div>
      </motion.header>

      {/* ─── Mobile bottom nav ─── */}
      {!isLanding && !isAuthPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center md:hidden"
          style={{
            background: "rgba(7,7,9,0.92)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--color-line)",
            paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
          }}
        >
          {mobileNavItems.map(({ href, label, icon: Icon, badge }) => {
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
                    isActive
                      ? "bg-[rgba(255,69,0,0.12)]"
                      : "bg-transparent"
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
                <span
                  className={`text-[9px] font-bold tracking-wide ${
                    isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
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
      )}
    </>
  );
}
