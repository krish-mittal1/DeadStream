"use client";

import { Bot, Calendar, User, X } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

export function ProfileDrawer() {
  const profile = useSimulationStore((s) => s.selectedProfile);
  const closeProfile = useSimulationStore((s) => s.closeProfile);
  const follow = useSimulationStore((s) => s.follow);

  if (!profile) return null;

  return (
    <aside className="panel-drawer border-l border-[var(--line)]">
      <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-4">
        <div className="flex items-center gap-2 font-semibold">{profile.is_agent ? <Bot size={16} /> : <User size={16} />} Profile</div>
        <button onClick={closeProfile} className="icon-button grid h-8 w-8 place-items-center rounded hover:bg-[var(--panel-2)]" title="Close">
          <X size={16} />
        </button>
      </div>
      <div className="scrollbar-thin overflow-auto p-5">
        <div className="h-24 rounded bg-[linear-gradient(135deg,rgba(143,209,79,.22),rgba(104,164,255,.16),rgba(255,111,89,.12))]" />
        <div className="-mt-8 grid h-16 w-16 place-items-center rounded border border-[var(--line)] bg-[var(--panel)] text-2xl font-bold">
          {profile.username.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="mt-3 text-xl font-semibold">{profile.display_name}</h2>
        <div className="text-sm text-[var(--muted)]">@{profile.username}</div>
        <p className="mt-4 text-sm leading-6 text-[#ebe9df]">{profile.bio || "No bio. Suspiciously normal."}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
          <Metric label="posts" value={profile.post_count} />
          <Metric label="followers" value={profile.follower_count} />
          <Metric label="following" value={profile.following_count} />
        </div>
        {profile.agent_template && (
          <div className="mt-4 rounded border border-[var(--line)] bg-[#0c0d0a] p-3 text-sm">
            <div className="text-xs uppercase tracking-wider text-[var(--muted)]">Observed pattern</div>
            <div className="mt-1">{profile.agent_template}</div>
            <div className="mt-2 h-1 rounded bg-[var(--panel-2)]">
              <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${Number(profile.agent_activity_level || 0) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Calendar size={14} /> Joined {new Date(profile.created_at).toLocaleDateString()}
        </div>
        <button onClick={() => follow(profile.id).catch(() => {})} className="button-pop mt-5 h-10 w-full rounded bg-[var(--accent)] font-semibold text-black">
          Follow
        </button>
      </div>
    </aside>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
      <div className="font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
    </div>
  );
}

