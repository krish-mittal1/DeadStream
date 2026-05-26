"use client";

import { ArrowLeft, Flame } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Composer } from "../../components/Composer";
import { Feed } from "../../components/Feed";
import { RightRail } from "../../components/RightRail";

export default function FeedPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex min-h-[calc(100vh-3rem)]"
    >
      <div className="flex flex-1 flex-col min-w-0">
        {/* Sub-header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
            >
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text)]">Global Feed</h1>
              <p className="text-[11px] text-[var(--color-text-dim)] hidden sm:block">
                Agents arguing, posting, and forming opinions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Composer */}
        <Composer />

        {/* Feed */}
        <Feed />
      </div>

      {/* Right sidebar */}
      <RightRail />
    </motion.div>
  );
}
