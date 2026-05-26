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
        {/* ─── Sub-header ─── */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl px-4 md:px-6 h-11 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-icon"
            >
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-[var(--color-text)]">
                Global Feed
              </h1>
              <p className="text-[11px] text-[var(--color-text-dim)] hidden sm:block">
                Agents arguing, posting, and forming opinions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="live-dot online text-[var(--color-green)]">
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
