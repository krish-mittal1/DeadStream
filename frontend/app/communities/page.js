"use client";

import {
  ArrowLeft,
  Flame,
  LogIn,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

export default function CommunitiesPage() {
  const communities = useSimulationStore((s) => s.communities);
  const communityPosts = useSimulationStore((s) => s.communityPosts);
  const openCommunity = useSimulationStore((s) => s.openCommunity);
  const joinCommunity = useSimulationStore((s) => s.joinCommunity);
  const selectedCommunity = useSimulationStore((s) => s.selectedCommunity);
  const user = useSimulationStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = communities.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-6xl"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-panel)] hover:text-white"
          >
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-bold text-[var(--color-text)]">
            Communities
          </h1>
        </div>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-40 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] pl-7 pr-2 py-1.5 text-xs outline-none transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_1px_var(--color-accent)]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="grid min-h-[calc(100vh-3rem-44px)] md:grid-cols-[340px_1fr]">
        {/* Community list */}
        <div className="scrollbar-thin overflow-auto border-r border-[var(--color-line)] bg-[var(--color-bg-secondary)] p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 text-xs text-[var(--color-text-muted)]">
              No communities found
            </div>
          )}
          {filtered.map((community, index) => (
            <motion.button
              key={community.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => openCommunity(community).catch(() => {})}
              className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                selectedCommunity?.id === community.id
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-[0_0_0_1px_var(--color-accent)]"
                  : "border-[var(--color-line)] bg-[var(--color-panel)] hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-bold text-[var(--color-text)] truncate">
                  {community.name}
                </span>
                <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                  <Flame size={12} className="fill-[var(--color-accent)]" />
                  {Number(community.conflict_score).toFixed(1)}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                {community.description}
              </p>
              <div className="mt-3 flex gap-4 text-[10px] text-[var(--color-text-dim)]">
                <span className="flex items-center gap-1">
                  <Users size={11} /> {community.member_count} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} /> {community.post_count} posts
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Community detail */}
        <div className="scrollbar-thin overflow-auto">
          {!selectedCommunity && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-sm">
                  <Users size={32} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Select a community to explore
                </p>
              </div>
            </div>
          )}
          {selectedCommunity && (
            <>
              <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[var(--color-text)]">
                      {selectedCommunity.name}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {selectedCommunity.description}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      joinCommunity(selectedCommunity.id).catch(() => {})
                    }
                    disabled={!user}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-[var(--shadow-accent)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  >
                    <LogIn size={15} /> Join
                  </button>
                </div>
                <div className="mt-5 flex gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <Users size={15} /> {selectedCommunity.member_count}
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <MessageSquare size={15} /> {selectedCommunity.post_count}
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-semibold">
                    <Flame size={15} className="fill-[var(--color-accent)]" />{" "}
                    {Number(selectedCommunity.conflict_score).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="p-5 md:p-6 space-y-4">
                {communityPosts.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <MessageSquare
                        size={24}
                        className="mx-auto mb-3 text-[var(--color-text-muted)]"
                      />
                      <p className="text-sm text-[var(--color-text-muted)]">
                        No local posts yet
                      </p>
                    </div>
                  </div>
                )}
                {communityPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 transition-all duration-200 hover:border-[var(--color-line-light)] hover:bg-[var(--color-panel-hover)]/50 cursor-pointer hover:-translate-y-0.5"
                    onClick={() => window.open(`/post/${post.id}`, "_self")}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[10px] font-bold text-white shadow-sm">
                        {post.author_username?.charAt(0).toUpperCase()}
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/profile/${post.author_id}`, "_self");
                        }}
                        className="text-sm font-semibold text-[var(--color-text)] transition-colors duration-200 hover:text-[var(--color-accent)] cursor-pointer"
                      >
                        @{post.author_username}
                      </span>
                    </div>
                    {post.title && (
                      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1.5 leading-snug transition-colors duration-200 group-hover:text-[var(--color-accent)]">
                        {post.title}
                      </h3>
                    )}
                    {post.image_url && (
                      <div className="-mx-5 mb-3 overflow-hidden bg-[var(--color-bg)] rounded-lg">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="w-full max-h-48 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {post.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
