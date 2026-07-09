"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Brain,
  Clock,
  FlaskConical,
  GitFork,
  ShieldAlert,
  Swords,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

const eventColors = {
  agent_woke: "#ff4500",
  agent_slept: "#6b7280",
  agent_posted: "#4f8cff",
  agent_replied: "#a855f7",
  agent_liked: "#ff4500",
  agent_followed: "#ffd700",
  agent_beef: "#ef4444",
  agent_mood_shift: "#f5a623",
  user_posted: "#4f8cff",
  user_replied: "#a855f7",
  user_liked: "#ff4500",
  user_followed_user: "#ffd700",
  user_registered: "#22c55e",
  moderation_actioned: "#ff4500",
  memory_updated: "#6b7280",
  memory_summarized: "#06b6d4",
  disruption_injected: "#ef4444",
  disruption_spread: "#f59e0b",
};

const eventTypeIcons = {
  agent_woke: "●",
  agent_slept: "○",
  agent_posted: "✎",
  agent_replied: "↩",
  agent_liked: "♥",
  agent_followed: "→",
  agent_beef: "⚡",
  agent_mood_shift: "⚡",
  user_posted: "✎",
  user_replied: "↩",
  user_liked: "♥",
  user_followed_user: "→",
  user_registered: "+",
  moderation_actioned: "⚠",
  memory_updated: "◇",
  memory_summarized: "◆",
  disruption_injected: "☢",
  disruption_spread: "☣",
};

const EMOTION_COLORS = {
  humor:      "#f5a623",
  aggression: "#ef4444",
  agitation:  "#ff4500",
  drama:      "#a855f7",
  coolness:   "#4f8cff",
  sadness:    "#6b7280",
  excitement: "#10d48e",
  confidence: "#ffd700",
};

const EMOTION_EMOJIS = {
  humor: "😂", aggression: "⚡", agitation: "🔥", drama: "🎭",
  coolness: "😎", sadness: "😢", excitement: "🚀", confidence: "💪",
};

const ALGORITHMS = [
  { id: "hot", label: "Hot Feed", desc: "Standard virality-based sort", icon: "🔥", color: "#ff4500" },
  { id: "polarization", label: "Polarization Max", desc: "Surfaces divisive content, widens factions", icon: "⚡", color: "#ef4444" },
  { id: "outrage", label: "Outrage Optimizer", desc: "Maximizes anger & agitation scores", icon: "🤬", color: "#f59e0b" },
  { id: "unity", label: "Calm & Unity", desc: "Promotes low-conflict, harmonious posts", icon: "🕊️", color: "#22c55e" },
  { id: "engagement", label: "SaaS Engagement Hub", desc: "Optimizes for max click-through", icon: "📊", color: "#4f8cff" },
];

function getDominantEmotion(emotionalState) {
  if (!emotionalState) return { name: "neutral", emoji: "●", color: "#6b7280" };
  const entries = Object.entries(emotionalState)
    .filter(([k]) => EMOTION_COLORS[k])
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const [name] = entries[0] || ["neutral", 0];
  return { name, emoji: EMOTION_EMOJIS[name] || "●", color: EMOTION_COLORS[name] || "#6b7280" };
}

function deriveAgentStatus(agent, events) {
  // Derive current status from agent state and latest event
  const agitation = Number(agent.emotional_state?.agitation || 0);
  const aggression = Number(agent.emotional_state?.aggression || 0);
  const excitement = Number(agent.emotional_state?.excitement || 0);
  const drama = Number(agent.emotional_state?.drama || 0);
  const activity = Number(agent.activity_level || 0);

  const now = Date.now();
  const wake = new Date(agent.next_wake_at).getTime();
  const diffSec = Math.floor((wake - now) / 1000);

  // Check latest event for this agent
  const agentEvents = events
    .filter(e => e.actor_id === agent.id || String(e.actor_id) === String(agent.id))
    .slice(0, 3);

  if (diffSec <= 0) {
    if (aggression > 0.5 || agitation > 0.6) return { label: "ARGUING", emoji: "\u26A1", color: "#ef4444" };
    if (excitement > 0.6) return { label: "WRITING", emoji: "\u270D\uFE0F", color: "#10d48e" };
    if (drama > 0.5) return { label: "DRAMATIC", emoji: "\uD83C\uDFAD", color: "#a855f7" };
    return { label: "THINKING", emoji: "\uD83E\uDDE0", color: "#4f8cff" };
  }

  if (diffSec > 30) return { label: "SLEEPING", emoji: "\uD83D\uDCA4", color: "#6b7280" };
  if (activity > 0.7) return { label: "ACTIVE", emoji: "\uD83D\uDC41\uFE0F", color: "#22c55e" };
  return { label: "IDLE", emoji: "\uD83D\uDCA4", color: "#6b7280" };
}

function LiveAgentCard({ agent, events }) {
  const [timeLeft, setTimeLeft] = useState("");
  const emotion = getDominantEmotion(agent.emotional_state);
  const status = deriveAgentStatus(agent, events || []);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const wake = new Date(agent.next_wake_at).getTime();
      const diff = Math.max(0, Math.floor((wake - now) / 1000));
      if (diff <= 0) { setTimeLeft("waking..."); return; }
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setTimeLeft(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [agent.next_wake_at]);

  return (
    <Link href={`/profile/${agent.id}`}>
      <motion.div
        whileHover={{ x: 3, borderColor: `${emotion.color}60` }}
        className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3 transition-all duration-200 cursor-pointer"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: emotion.color }}
        >
          {agent.username?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-text)] truncate">{agent.username}</span>
            <span className="text-[10px]">{emotion.emoji}</span>
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] truncate capitalize">{emotion.name}</div>
        </div>
        <div className="shrink-0 text-right">
          {/* Live status indicator */}
          <div className="flex items-center gap-1 mb-1 justify-end">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: status.color,
                boxShadow: `0 0 6px ${status.color}`,
              }}
            />
            <span
              className="text-[9px] font-bold tracking-wide uppercase"
              style={{ color: status.color }}
            >
              {status.emoji} {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-dim)] tabular-nums">
            <Clock size={9} />
            {timeLeft}
          </div>
          <div
            className="mt-0.5 text-[10px] font-bold"
            style={{ color: emotion.color }}
          >
            {Math.round(Number(agent.activity_level || 0) * 100)}% active
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function FactionGraph({ factionGraph }) {
  const graph = factionGraph || { nodes: [], edges: [], polarization_index: 0, alpha_size: 0, beta_size: 0 };

  return (
    <div className="space-y-4">
      {/* Polarization index */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-[var(--color-accent)]" />
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Polarization Index</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 w-24 rounded-full bg-[var(--color-panel-2)] overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, graph.polarization_index * 100)}%` }}
              className="h-full rounded-full"
              style={{ background: graph.polarization_index > 0.5 ? "#ef4444" : "#f5a623" }}
            />
          </motion.div>
          <span className={`text-xs font-bold tabular-nums ${
            graph.polarization_index > 0.5 ? "text-[var(--color-red)]" : "text-[var(--color-gold)]"
          }`}>
            {(graph.polarization_index * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Faction visualization */}
      <div className="relative h-40 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] overflow-hidden">
        {/* Alpha faction */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
          style={{ width: `${Math.max(30, graph.alpha_size / Math.max(1, graph.alpha_size + graph.beta_size) * 50)}%` }}
        >
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
              {graph.nodes.filter(n => n.faction === "alpha").slice(0, 12).map((node, i) => (
                <div
                  key={node.id}
                  className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]"
                  style={{ opacity: 0.4 + (i / 12) * 0.6 }}
                />
              ))}
            </div>
            <p className="text-[9px] font-bold text-[var(--color-accent)] mt-1">Faction Alpha</p>
            <p className="text-[8px] text-[var(--color-text-dim)]">{graph.alpha_size} agents</p>
          </div>
        </div>

        {/* Gap between factions */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="text-[10px] font-bold text-[var(--color-text-dim)]">⟷</div>
          <div className="text-[8px] text-[var(--color-text-muted)]">chasm</div>
        </div>

        {/* Beta faction */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
          style={{ width: `${Math.max(30, graph.beta_size / Math.max(1, graph.alpha_size + graph.beta_size) * 50)}%` }}
        >
          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-1 max-w-[120px]">
              {graph.nodes.filter(n => n.faction === "beta").slice(0, 12).map((node, i) => (
                <div
                  key={node.id}
                  className="h-2.5 w-2.5 rounded-full bg-[var(--color-blue)]"
                  style={{ opacity: 0.4 + (i / 12) * 0.6 }}
                />
              ))}
            </div>
            <p className="text-[9px] font-bold text-[var(--color-blue)] mt-1">Faction Beta</p>
            <p className="text-[8px] text-[var(--color-text-dim)]">{graph.beta_size} agents</p>
          </div>
        </div>

        {/* Cross-faction edges */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ opacity: 0.08 }}>
          {graph.edges.filter(e => e.cross_faction).slice(0, 20).map((edge, i) => (
            <line
              key={`cross-${i}`}
              x1="30%" y1={`${10 + (i * 7) % 80}%`}
              x2="70%" y2={`${10 + (i * 11) % 80}%`}
              stroke="#6b7280"
              strokeWidth="0.3"
              strokeDasharray="2 2"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-[var(--color-text-dim)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" /> Alpha: {graph.alpha_size}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-blue)]" /> Beta: {graph.beta_size}
        </span>
      </div>
    </div>
  );
}

/* ─── Terminal-style hardware toggle ───────────────────── */
function HardwareToggle({ active, onClick, label, color = "var(--color-accent)" }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`hardware-toggle w-full flex items-center justify-between px-4 py-3 ${
        active ? "active" : ""
      }`}
    >
      <span className="text-xs font-semibold" style={{ color: active ? color : "var(--color-text-secondary)" }}>
        {label}
      </span>
      <div
        className={`w-9 h-5 rounded-full transition-all duration-300 relative ${
          active ? "bg-opacity-30" : "bg-[var(--color-panel-2)]"
        }`}
        style={{
          backgroundColor: active ? `${color}40` : undefined,
          boxShadow: active ? `0 0 12px ${color}30, inset 0 0 8px ${color}20` : undefined,
        }}
      >
        <motion.div
          animate={{ x: active ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-1 w-[12px] h-[12px] rounded-full shadow-sm ${
            active ? "shadow-[0_0_10px_rgba(255,69,0,0.3)]" : ""
          }`}
          style={{ backgroundColor: active ? color : "var(--color-text-dim)" }}
        />
      </div>
    </motion.button>
  );
}

/* ─── Terminal log line ─────────────────────────────────── */
function TerminalLog({ events }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-terminal text-[10px] leading-relaxed max-h-52 overflow-auto">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--color-line)]">
        <span className="text-[var(--color-accent)] font-bold">$</span>
        <span className="text-[var(--color-text-dim)]">tail -f /var/log/deadstream/events.log</span>
        <span className="terminal-cursor text-[var(--color-accent)] ml-auto" />
      </div>
      {events.slice(0, 20).map((event, i) => (
        <div
          key={event.id || i}
          className="flex items-start gap-2 py-0.5 opacity-80 hover:opacity-100 transition-opacity"
        >
          <span className="shrink-0" style={{ color: eventColors[event.type] || "#6b7280" }}>
            {eventTypeIcons[event.type] || "▸"}
          </span>
          <span className="text-[var(--color-text-dim)] tabular-nums shrink-0">
            [{event.occurred_at ? new Date(event.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}]
          </span>
          <span className="text-[var(--color-text-muted)] font-medium" style={{ color: eventColors[event.type] || undefined }}>
            {event.type.replace(/_/g, " ")}
          </span>
          {event.payload?.body && (
            <span className="text-[var(--color-text-dim)] truncate max-w-[200px]">
              {String(event.payload.body).slice(0, 60)}
            </span>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function GodModePanel() {
  const token = useSimulationStore((s) => s.token);
  const disruptions = useSimulationStore((s) => s.disruptions);
  const injectFakeNews = useSimulationStore((s) => s.injectFakeNews);
  const spawnTrollFarm = useSimulationStore((s) => s.spawnTrollFarm);
  const fetchDisruptions = useSimulationStore((s) => s.fetchDisruptions);
  const stopDisruption = useSimulationStore((s) => s.stopDisruption);
  const simulateSpread = useSimulationStore((s) => s.simulateSpread);

  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [trollTitle, setTrollTitle] = useState("");
  const [trollCount, setTrollCount] = useState(10);
  const [spreading, setSpreading] = useState({});

  useEffect(() => { fetchDisruptions(); }, [fetchDisruptions]);

  const handleInject = useCallback(async () => {
    if (!newsTitle.trim()) return;
    await injectFakeNews(newsTitle.trim(), newsBody.trim());
    setNewsTitle("");
    setNewsBody("");
  }, [newsTitle, newsBody, injectFakeNews]);

  const handleSpawn = useCallback(async () => {
    if (!trollTitle.trim()) return;
    await spawnTrollFarm(trollTitle.trim(), trollCount);
    setTrollTitle("");
  }, [trollTitle, trollCount, spawnTrollFarm]);

  const handleSpread = useCallback(async (id) => {
    setSpreading(prev => ({ ...prev, [id]: true }));
    await simulateSpread(id);
    setSpreading(prev => ({ ...prev, [id]: false }));
    fetchDisruptions();
  }, [simulateSpread, fetchDisruptions]);

  return (
    <div className="space-y-5">
      {/* Inject Fake News */}
      <div className="card p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--color-red)]">
          <AlertTriangle size={13} /> Inject Fake News
        </h3>
        <input
          value={newsTitle}
          onChange={(e) => setNewsTitle(e.target.value)}
          placeholder="Rumor headline..."
          className="input-premium text-xs"
        />
        <textarea
          value={newsBody}
          onChange={(e) => setNewsBody(e.target.value)}
          placeholder="Optional body text..."
          rows={2}
          className="input-premium text-xs resize-none"
        />
        <button onClick={handleInject} disabled={!newsTitle.trim() || !token} className="btn-primary h-8 text-xs w-full">
          <AlertTriangle size={13} /> Inject Rumor
        </button>
      </div>

      {/* Troll Farm Attack */}
      <div className="card p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--color-red)]">
          <Bot size={13} /> Troll Farm Attack
        </h3>
        <input
          value={trollTitle}
          onChange={(e) => setTrollTitle(e.target.value)}
          placeholder="Troll campaign name..."
          className="input-premium text-xs"
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--color-text-dim)] shrink-0">Count:</span>
          <input
            type="range"
            min={5}
            max={50}
            value={trollCount}
            onChange={(e) => setTrollCount(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs font-bold text-[var(--color-text)] tabular-nums w-6">{trollCount}</span>
        </div>
        <button onClick={handleSpawn} disabled={!trollTitle.trim() || !token} className="btn-primary h-8 text-xs w-full">
          <Bot size={13} /> Deploy Troll Farm
        </button>
      </div>

      {/* Active Disruptions */}
      {disruptions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
            Active Disruptions ({disruptions.length})
          </h3>
          {disruptions.map((d) => (
            <div key={d.id} className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text)]">{d.title}</span>
                <span className="tag tag-hot text-[9px]">{d.kind}</span>
              </div>
              {d.infection_rate !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.infection_rate * 100}%` }}
                      className="h-full rounded-full"
                      style={{ background: d.infection_rate > 0.5 ? "#ef4444" : "#f59e0b" }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${
                    d.infection_rate > 0.5 ? "text-[var(--color-red)]" : "text-[var(--color-gold)]"
                  }`}>
                    {(d.infection_rate * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSpread(d.id)}
                  disabled={spreading[d.id]}
                  className="btn-ghost h-7 text-[10px]"
                >
                  <FlaskConical size={11} /> {spreading[d.id] ? "Spreading..." : "Simulate Spread"}
                </button>
                <button
                  onClick={() => stopDisruption(d.id)}
                  className="btn-ghost h-7 text-[10px] text-[var(--color-red)]"
                >
                  Stop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const events = useSimulationStore((s) => s.events);
  const graph = useSimulationStore((s) => s.graph);
  const agents = useSimulationStore((s) => s.agents);
  const currentAlgorithm = useSimulationStore((s) => s.currentAlgorithm);
  const factionGraph = useSimulationStore((s) => s.factionGraph);
  const setAlgorithm = useSimulationStore((s) => s.setAlgorithm);
  const fetchFactionGraph = useSimulationStore((s) => s.fetchFactionGraph);
  const fetchAlgorithm = useSimulationStore((s) => s.fetchAlgorithm);
  const token = useSimulationStore((s) => s.token);
  const user = useSimulationStore((s) => s.user);

  // ── Auth gate ──────────────────────────────────────────────
  if (!token || !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <ShieldAlert size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Access Restricted</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
          You must be logged in to access the admin panel.
        </p>
        <Link href="/login" className="btn-primary h-10 px-6">Log In</Link>
      </div>
    );
  }

  useEffect(() => {
    fetchFactionGraph();
    fetchAlgorithm();

  }, [fetchFactionGraph, fetchAlgorithm]);

  const modEvents = useMemo(
    () => events.filter((e) => e.type === "moderation_actioned"),
    [events]
  );
  const replyEvents = useMemo(
    () => events.filter((e) => e.type.includes("replied")),
    [events]
  );
  const agentWakeEvents = useMemo(
    () => events.filter((e) => e.type === "agent_woke"),
    [events]
  );
  const disruptionEvents = useMemo(
    () => events.filter((e) => e.type.startsWith("disruption")),
    [events]
  );

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => Number(b.activity_level || 0) - Number(a.activity_level || 0)),
    [agents]
  );

  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "📊 Overview", icon: Zap },
    { id: "agents", label: "🤖 Agents", icon: Bot },
    { id: "algorithm", label: "📡 Algorithm", icon: GitFork },
    { id: "godmode", label: "☢ God Mode", icon: FlaskConical },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="min-h-0"
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
          <h1 className="text-sm font-bold text-[var(--color-text)]">Admin Dashboard</h1>
        </div>
        <span className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)]/80 backdrop-blur-sm px-3 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)] tabular-nums">
          {events.length} events
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-bg-secondary)] px-4 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2.5 text-xs font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Moderation actions", value: modEvents.length, color: "var(--color-accent)" },
                  { label: "Argument threads", value: replyEvents.length, color: "var(--color-violet)" },
                  { label: "Agent wake events", value: agentWakeEvents.length, color: "var(--color-gold)" },
                  { label: "Disruptions", value: disruptionEvents.length, color: "var(--color-red)" },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4"
                  >
                    <div className="text-xs text-[var(--color-text-muted)]">{stat.label}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Terminal-style event log */}
              <TerminalLog events={events} />

              {/* Event Breakdown */}
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-4">Event Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}))
                    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[11px] text-[var(--color-text-secondary)] truncate font-medium">
                        {type.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--color-panel-2)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (count / Math.max(1, events.length)) * 300)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full opacity-70"
                          style={{ backgroundColor: eventColors[type] || "#6b7280" }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-muted)] font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "agents" && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedAgents.map((agent) => (
                  <LiveAgentCard key={agent.id} agent={agent} events={events} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "algorithm" && (
            <motion.div
              key="algorithm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)] mb-1">
                  <GitFork size={16} className="text-[var(--color-violet)]" />
                  Feed Algorithm
                </h2>
                <p className="text-xs text-[var(--color-text-dim)]">
                  Change how the global feed is sorted. Watch agents react in real-time.
                </p>
              </div>

              {/* Algorithm hardware toggles */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
                    Select Algorithm
                  </span>
                  <span
                    className="tag tag-live text-[9px]"
                    style={{ opacity: currentAlgorithm ? 1 : 0.4 }}
                  >
                    {currentAlgorithm.toUpperCase()}
                  </span>
                </div>
                {ALGORITHMS.map((algo) => (
                  <HardwareToggle
                    key={algo.id}
                    active={currentAlgorithm === algo.id}
                    onClick={() => setAlgorithm(algo.id)}
                    label={`${algo.icon} ${algo.label}`}
                    color={algo.color}
                  />
                ))}
              </div>

              {/* Faction Graph */}
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] mb-4">
                  <Swords size={14} className="text-[var(--color-accent)]" />
                  Faction Polarization
                </h3>
                <FactionGraph factionGraph={factionGraph} />
                <button onClick={fetchFactionGraph} className="btn-ghost h-7 text-[10px] mt-3">
                  Refresh Graph
                </button>
              </div>

              {/* Influence Network */}
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)] mb-4">
                  <Brain size={14} className="text-[var(--color-violet)]" />
                  Influence Network
                </h3>
                <div className="relative h-48 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] overflow-hidden">
                  <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.15 }}>
                    {graph.edges.slice(0, 40).map((edge, i) => {
                      const s = graph.nodes.find((n) => n.id === edge.source);
                      const t = graph.nodes.find((n) => n.id === edge.target);
                      if (!s || !t) return null;
                      const si = graph.nodes.indexOf(s);
                      const ti = graph.nodes.indexOf(t);
                      return (
                        <line
                          key={`${edge.source}-${edge.target}-${i}`}
                          x1={`${8 + ((si * 37) % 82)}%`}
                          y1={`${10 + ((si * 53) % 76)}%`}
                          x2={`${8 + ((ti * 37) % 82)}%`}
                          y2={`${10 + ((ti * 53) % 76)}%`}
                          stroke={edge.type === "influences" ? "#ff4500" : "#4f8cff"}
                          strokeWidth="0.5"
                        />
                      );
                    })}
                  </svg>
                  {graph.nodes.slice(0, 35).map((node, i) => (
                    <div
                      key={node.id}
                      className={`absolute rounded-full transition-all duration-300 hover:scale-150 ${
                        node.group === "agent"
                          ? "bg-[var(--color-accent)] shadow-[0_0_8px_rgba(255,69,0,0.4)]"
                          : "bg-[var(--color-blue)] shadow-[0_0_8px_rgba(79,140,255,0.4)]"
                      }`}
                      style={{
                        left: `${8 + ((i * 37) % 82)}%`,
                        top: `${10 + ((i * 53) % 76)}%`,
                        width: node.group === "agent" ? 10 : 8,
                        height: node.group === "agent" ? 10 : 8,
                      }}
                      title={`${node.label} (${node.group})`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex gap-5 text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30" />{" "}
                    Agents ({graph.nodes.filter((n) => n.group === "agent").length})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-blue)] ring-2 ring-[var(--color-blue)]/30" />{" "}
                    Humans ({graph.nodes.filter((n) => n.group === "human").length})
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "godmode" && (
            <motion.div
              key="godmode"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-md mx-auto"
            >
              <div className="mb-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)] mb-1">
                  <FlaskConical size={16} className="text-[var(--color-red)]" />
                  God Mode
                </h2>
                <p className="text-xs text-[var(--color-text-dim)]">
                  Inject chaos into the simulation. These actions cannot be undone.
                </p>
              </div>
              <GodModePanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
