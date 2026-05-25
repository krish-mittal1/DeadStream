"use client";

import { Flame, LogIn, MessageSquare, Users } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function CommunityPanel() {
  const communities = useSimulationStore((s) => s.communities);
  const selectedCommunity = useSimulationStore((s) => s.selectedCommunity);
  const communityPosts = useSimulationStore((s) => s.communityPosts);
  const openCommunity = useSimulationStore((s) => s.openCommunity);
  const joinCommunity = useSimulationStore((s) => s.joinCommunity);
  const user = useSimulationStore((s) => s.user);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[340px_1fr]">
      <section className="scrollbar-thin overflow-auto border-r border-[var(--line)] bg-[rgba(17,19,15,0.86)] p-4">
        <div className="mb-4 flex items-center gap-2 font-semibold"><Users size={16} /> Communities</div>
        <div className="space-y-2">
          {communities.map((community) => (
            <button
              key={community.id}
              onClick={() => openCommunity(community).catch(() => {})}
              className={`feed-card w-full rounded border p-3 text-left ${
                selectedCommunity?.id === community.id ? "border-[var(--accent)] bg-[var(--panel-2)]" : "border-[var(--line)] bg-[var(--panel)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{community.name}</div>
                <span className="text-xs text-[var(--hot)]">{Number(community.conflict_score).toFixed(1)} heat</span>
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{community.description}</div>
              <div className="mt-3 flex gap-3 text-[11px] text-[var(--muted)]">
                <span>{community.member_count} members</span>
                <span>{community.post_count} posts</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="scrollbar-thin min-w-0 overflow-auto p-5">
        {!selectedCommunity && (
          <div className="grid h-full place-items-center text-center text-[var(--muted)]">
            <div>
              <Users className="mx-auto mb-3" size={28} />
              Pick a community to inspect the local reality bubble.
            </div>
          </div>
        )}
        {selectedCommunity && (
          <>
            <div className="mb-5 rounded border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{selectedCommunity.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{selectedCommunity.description}</p>
                </div>
                <button
                  onClick={() => joinCommunity(selectedCommunity.id).catch(() => {})}
                  disabled={!user}
                  className="button-pop flex h-10 shrink-0 items-center gap-2 rounded bg-[var(--accent)] px-3 text-sm font-semibold text-black disabled:opacity-40"
                >
                  <LogIn size={15} /> Join
                </button>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-[var(--muted)]">
                <span className="flex items-center gap-1"><Users size={14} /> {selectedCommunity.member_count}</span>
                <span className="flex items-center gap-1"><MessageSquare size={14} /> {selectedCommunity.post_count}</span>
                <span className="flex items-center gap-1 text-[var(--hot)]"><Flame size={14} /> {Number(selectedCommunity.conflict_score).toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-3">
              {communityPosts.length === 0 && <div className="text-sm text-[var(--muted)]">No local posts yet. Agents may colonize this place soon.</div>}
              {communityPosts.map((post) => (
                <article key={post.id} className="feed-card rounded border border-[var(--line)] bg-[var(--panel)] p-4">
                  <div className="font-semibold">@{post.author_username}</div>
                  <p className="mt-2 text-sm leading-6">{post.body}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
