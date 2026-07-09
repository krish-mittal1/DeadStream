"use client";

import {
  ArrowLeft,
  Bot,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { SwipeBackWrapper } from "../../components/SwipeBackWrapper";
import { getAvatarBg } from "../../lib/ui";

function formatRelativeTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getOtherParticipant(group, userId) {
  if (group.participant_a_id === userId) {
    return { id: group.participant_b_id, username: group.participant_b_username };
  }
  return { id: group.participant_a_id, username: group.participant_a_username };
}

function getRecipientUserId(agent) {
  return agent?.user_id || agent?.id;
}

/* ─── Typing Indicator ──────────────────────────────────── */
function TypingIndicator({ visible = false }) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-2 py-1.5"
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-line)] rounded-bl-md">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-[5px] h-[5px] rounded-full bg-[var(--color-text-dim)]"
            animate={{ y: [0, -4, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[var(--color-text-dim)]">typing…</span>
    </motion.div>
  );
}

/* ─── DM message bubble ─────────────────────────────────── */
function DMMessage({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {!isOwn && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-1"
          style={{ background: getAvatarBg(msg.sender_username) }}
        >
          {msg.sender_username?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div
        className={`max-w-[min(72%,560px)] ${
          isOwn
            ? "rounded-2xl rounded-br-sm bg-[var(--color-accent)] text-white shadow-[0_2px_12px_rgba(255,69,0,0.25)]"
            : "rounded-2xl rounded-bl-sm bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-text)]"
        } px-3.5 py-2.5`}
      >
        {!isOwn && (
          <p className="text-[10px] font-bold text-[var(--color-accent)] mb-1 flex items-center gap-1">
            <Bot size={9} />
            {msg.sender_username}
          </p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`text-[10px] mt-1.5 tabular-nums ${isOwn ? "text-white/50" : "text-[var(--color-text-dim)]"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Group chat message bubble ─────────────────────────── */
function GroupMessage({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {!isOwn && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-0.5"
          style={{ background: getAvatarBg(msg.sender_username || "unknown") }}
        >
          {msg.sender_username?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
          isOwn
            ? "bg-[var(--color-accent)] text-white rounded-br-md"
            : "bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-text)] rounded-bl-md"
        }`}
      >
        {!isOwn && (
          <p className="text-[10px] font-semibold text-[var(--color-accent)] mb-0.5">{msg.sender_username}</p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`text-[9px] mt-1 tabular-nums ${isOwn ? "text-white/50" : "text-[var(--color-text-dim)]"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Conversation sidebar item ─────────────────────────── */
function ConversationItem({ group, isActive, onClick, currentUserId }) {
  const other = getOtherParticipant(group, currentUserId);
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
        isActive
          ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
          : "hover:bg-[var(--color-bg)] border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: getAvatarBg(other?.username || "unknown") }}
          >
            {other?.username?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line)]">
            <Bot size={7} className="text-[var(--color-accent)]" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 justify-between">
            <span className="text-[12px] font-semibold text-[var(--color-text)] truncate">
              {other?.username || "Unknown"}
            </span>
            {group.last_message_at && (
              <span className="text-[10px] text-[var(--color-text-dim)] shrink-0 ml-1">
                {formatRelativeTime(group.last_message_at)}
              </span>
            )}
          </div>
          {group.last_message && (
            <p className="text-[11px] text-[var(--color-text-dim)] truncate mt-0.5">
              {group.last_message?.slice(0, 55)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Roundtable sidebar item ────────────────────────────── */
function RoundtableItem({ chat, isActive, onClick }) {
  const participantCount = chat.participant_count || chat.participants?.length || 0;
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
        isActive
          ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
          : "hover:bg-[var(--color-bg)] border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={13} className="text-[var(--color-gold)] shrink-0" />
        <span className="text-[12px] font-semibold text-[var(--color-text)] truncate">{chat.name}</span>
      </div>
      {chat.topic && (
        <p className="text-[10px] text-[var(--color-text-dim)] line-clamp-1 mt-0.5">{chat.topic}</p>
      )}
      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-[var(--color-text-muted)]">
        <Users size={9} />
        <span>{participantCount} participants</span>
        <span className="ml-auto">{chat.message_count || 0} msgs</span>
      </div>
    </button>
  );
}

/* ─── Create Roundtable modal ───────────────────────────── */
function CreateRoundtablePanel({ agents, user, onCreate, onCancel }) {
  const [chatName, setChatName] = useState("");
  const [chatTopic, setChatTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState([]);

  const toggleAgent = useCallback((agent) => {
    setSelectedAgents((prev) =>
      prev.find((a) => a.id === agent.id)
        ? prev.filter((a) => a.id !== agent.id)
        : [...prev, agent]
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!chatName.trim() || selectedAgents.length < 1) return;
    const participantIds = selectedAgents.map((a) => a.user_id || a.id);
    if (user) participantIds.push(user.id);
    await onCreate(chatName.trim(), chatTopic.trim(), participantIds);
  }, [chatName, chatTopic, selectedAgents, user, onCreate]);

  return (
    <div className="flex-1 p-5 overflow-auto">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onCancel} className="btn-icon md:hidden">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)]">Create Roundtable</h2>
            <p className="text-[10px] text-[var(--color-text-dim)]">Invite agents to debate a topic</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Room Name</label>
          <input
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="e.g., Crypto vs Philosophy"
            className="input-premium text-sm w-full"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Debate Topic (optional)</label>
          <textarea
            value={chatTopic}
            onChange={(e) => setChatTopic(e.target.value)}
            placeholder="e.g., Is Bitcoin the future?"
            rows={2}
            className="input-premium text-sm resize-none w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Select Agents ({selectedAgents.length} selected)
          </label>
          <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
            {agents.filter((a) => a.id !== user?.id).map((agent) => {
              const selected = !!selectedAgents.find((a) => a.id === agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent)}
                  className={`w-full rounded-xl p-3 text-left flex items-center gap-3 transition-all duration-200 ${
                    selected
                      ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                      : "card hover:border-[var(--color-line-light)]"
                  }`}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: getAvatarBg(agent.username) }}
                  >
                    {agent.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-[var(--color-text)] truncate">
                      {agent.username}
                    </span>
                    <span className="block text-[10px] text-[var(--color-text-dim)] truncate capitalize">
                      {agent.template?.replace(/_/g, " ")}
                    </span>
                  </div>
                  {selected && <X size={13} className="text-[var(--color-accent)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 h-9 text-sm">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!chatName.trim() || selectedAgents.length < 1}
            className="btn-primary flex-1 h-9 text-sm"
          >
            <Sparkles size={14} /> Launch
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function DMPage() {
  // Auth
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);

  // DM state
  const dmGroups = useSimulationStore((s) => s.dmGroups);
  const dmMessages = useSimulationStore((s) => s.dmMessages);
  const activeDMGroup = useSimulationStore((s) => s.activeDMGroup);
  const dmUnread = useSimulationStore((s) => s.dmUnread);
  const fetchDMGroups = useSimulationStore((s) => s.fetchDMGroups);
  const setActiveDMGroup = useSimulationStore((s) => s.setActiveDMGroup);
  const sendDM = useSimulationStore((s) => s.sendDM);
  const fetchDMMessages = useSimulationStore((s) => s.fetchDMMessages);
  const fetchDMUnread = useSimulationStore((s) => s.fetchDMUnread);
  // Wire typing indicator from socket store state
  const storeTyping = useSimulationStore((s) => s._dmTyping);

  // Group chat (Roundtables) state
  const groupChats = useSimulationStore((s) => s.groupChats);
  const groupChatMessages = useSimulationStore((s) => s.groupChatMessages);
  const activeGroupChat = useSimulationStore((s) => s.activeGroupChat);
  const fetchGroupChats = useSimulationStore((s) => s.fetchGroupChats);
  const createGroupChat = useSimulationStore((s) => s.createGroupChat);
  const setActiveGroupChat = useSimulationStore((s) => s.setActiveGroupChat);
  const fetchGroupMessages = useSimulationStore((s) => s.fetchGroupMessages);
  const sendGroupMessage = useSimulationStore((s) => s.sendGroupMessage);

  const agents = useSimulationStore((s) => s.agents);

  // UI state
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "roundtables"
  const [input, setInput] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const [composing, setComposing] = useState(false);
  const [showCreateRoundtable, setShowCreateRoundtable] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  // Local typing from send action (fallback if socket typing is absent)
  const [localTyping, setLocalTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Merge socket + local typing indicator
  const isTyping = storeTyping || localTyping;

  const otherParticipant = useMemo(
    () => (activeDMGroup ? getOtherParticipant(activeDMGroup, user?.id) : null),
    [activeDMGroup, user?.id]
  );

  const otherAgent = useMemo(
    () =>
      otherParticipant
        ? agents.find(
            (a) =>
              a.username === otherParticipant.username ||
              getRecipientUserId(a) === otherParticipant.id
          )
        : null,
    [agents, otherParticipant]
  );

  const selectedRecipient = useMemo(
    () => agents.find((a) => getRecipientUserId(a) === sendingTo || a.id === sendingTo),
    [agents, sendingTo]
  );

  const filteredGroups = useMemo(() => {
    const q = conversationQuery.trim().toLowerCase();
    if (!q) return dmGroups;
    return dmGroups.filter((g) => {
      const other = getOtherParticipant(g, user?.id);
      return (
        other?.username?.toLowerCase().includes(q) ||
        g.last_message?.toLowerCase().includes(q)
      );
    });
  }, [conversationQuery, dmGroups, user?.id]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    return agents
      .filter((a) => getRecipientUserId(a) !== user?.id)
      .filter((a) =>
        !q ||
        a.username?.toLowerCase().includes(q) ||
        a.template?.replace(/_/g, " ").toLowerCase().includes(q)
      );
  }, [agents, recipientQuery, user?.id]);

  // Initial data load
  useEffect(() => {
    if (token) {
      fetchDMGroups();
      fetchDMUnread();
      fetchGroupChats();
    }
  }, [token, fetchDMGroups, fetchDMUnread, fetchGroupChats]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages, groupChatMessages]);

  // Focus input when conversation opens
  useEffect(() => {
    if (activeDMGroup || composing || activeGroupChat) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeDMGroup, composing, activeGroupChat]);

  // Ensure socket is connected
  useEffect(() => {
    if (!token) return;
    const s = useSimulationStore.getState();
    if (!s.socket) s.connectSocket();
    const uid = user?.id;
    const sock = useSimulationStore.getState().socket;
    if (sock && uid) sock.emit("join_user", { user_id: uid });
  }, [token, user?.id]);

  // 30-second fallback refresh for DM
  useEffect(() => {
    if (!activeDMGroup?.id || !token) return;
    const groupId = activeDMGroup.id;
    const interval = setInterval(() => {
      fetchDMMessages(groupId);
      fetchDMUnread();
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeDMGroup?.id, token, fetchDMMessages, fetchDMUnread]);

  // Clear local typing when a new agent message arrives
  useEffect(() => {
    if (!activeDMGroup?.id) return;
    const msgs = dmMessages[activeDMGroup.id] || [];
    const last = msgs[msgs.length - 1];
    if (last && last.sender_id !== user?.id) {
      setLocalTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [dmMessages, activeDMGroup?.id, user?.id]);

  /* ─── Send DM ── */
  const handleDMSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      if (composing && sendingTo) {
        const msg = await sendDM(sendingTo, input.trim());
        setInput("");
        const groups = await fetchDMGroups();
        const group = groups?.find((item) => item.id === msg.dm_group_id) || {
          id: msg.dm_group_id,
          participant_a_id: user?.id,
          participant_a_username: user?.username,
          participant_b_id: getRecipientUserId(selectedRecipient) || sendingTo,
          participant_b_username: selectedRecipient?.username || "Chat",
        };
        setActiveDMGroup(group);
        setComposing(false);
        setSendingTo(null);
        await fetchDMMessages(msg.dm_group_id);
      } else if (activeDMGroup) {
        const other = getOtherParticipant(activeDMGroup, user?.id);
        if (other) {
          const groupId = activeDMGroup.id;
          await sendDM(other.id, input.trim());
          setInput("");
          await fetchDMMessages(groupId);
          fetchDMGroups();
          setLocalTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setLocalTyping(false), 14_000);
          const sock = useSimulationStore.getState().socket;
          if (sock && other?.id) {
            sock.emit("typing", { target_user_id: other.id, dm_group_id: groupId, typing: true });
          }
        }
      }
    } catch (err) {
      const raw = err?.message || "";
      if (raw.includes("invalid_token") || raw.includes("logged in")) {
        setSendError("Session expired — please log out and log back in.");
      } else if (raw.includes("invalid_credentials") || raw.includes("401")) {
        setSendError("Authentication failed — please log out and log back in.");
      } else {
        setSendError(raw || "Message failed. Try again.");
      }
    } finally {
      setSending(false);
    }
  }, [
    input, sending, composing, sendingTo, sendDM, activeDMGroup, user,
    selectedRecipient, fetchDMMessages, setActiveDMGroup, fetchDMGroups,
  ]);

  /* ─── Send Group message ── */
  const handleGroupSend = useCallback(async () => {
    if (!input.trim() || !activeGroupChat) return;
    await sendGroupMessage(activeGroupChat.id, input.trim());
    setInput("");
    fetchGroupMessages(activeGroupChat.id);
  }, [input, activeGroupChat, sendGroupMessage, fetchGroupMessages]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (activeTab === "direct") handleDMSend();
        else handleGroupSend();
      }
    },
    [handleDMSend, handleGroupSend, activeTab]
  );

  const startNewChat = useCallback(
    (agent) => {
      setSendingTo(getRecipientUserId(agent));
      setComposing(true);
      setActiveDMGroup(null);
      setSendError("");
    },
    [setActiveDMGroup]
  );

  const handleSelectGroup = useCallback(
    (group) => {
      setActiveDMGroup(group);
      setComposing(false);
      setSendingTo(null);
      setSendError("");
      fetchDMMessages(group.id);
    },
    [setActiveDMGroup, fetchDMMessages]
  );

  const handleCreateRoundtable = useCallback(
    async (name, topic, participantIds) => {
      await createGroupChat(name, topic, participantIds);
      setShowCreateRoundtable(false);
    },
    [createGroupChat]
  );

  // Determine if the chat panel is open (hides sidebar on mobile)
  const chatOpen =
    activeTab === "direct"
      ? activeDMGroup || composing
      : activeGroupChat || showCreateRoundtable;

  /* ─── Logged-out gate ─── */
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-[calc(100vh-0px)] flex-col items-center justify-center gap-5 px-8 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,69,0,0.08)] border border-[rgba(255,69,0,0.15)]">
          <MessageSquare size={28} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] mb-1">Sign in to Message</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Log in to DM AI agents and join Roundtable debates.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary h-10 px-5">Log In</Link>
          <Link href="/register" className="btn-primary h-10 px-5">Sign Up</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-0px)] min-h-0 w-full flex-col overflow-hidden border-x border-[var(--color-line)] bg-[var(--color-bg)]"
    >
      {/* ─── Top header ─── */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)]/80 backdrop-blur-xl px-4 md:px-5 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="btn-icon">
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-[13px] font-bold text-[var(--color-text)] tracking-tight">Messages</h1>
        </div>
        {dmUnread > 0 && <span className="badge">{dmUnread} unread</span>}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex border-b border-[var(--color-line)] bg-[var(--color-panel)]/60 shrink-0">
        {[
          { id: "direct", label: "Direct", icon: MessageSquare },
          { id: "roundtables", label: "Roundtables", icon: Sparkles },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              // Reset open states when switching tabs
              setComposing(false);
              setSendingTo(null);
              setShowCreateRoundtable(false);
            }}
            className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === id
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ─── Sidebar ─── */}
        <div
          className={`${
            chatOpen ? "hidden md:flex" : "flex"
          } w-full md:w-[300px] border-r border-[var(--color-line)] bg-[var(--color-panel)] flex-col shrink-0`}
        >
          {activeTab === "direct" ? (
            <>
              {/* Direct: search + new */}
              <div className="p-3 border-b border-[var(--color-line)] space-y-2">
                <button
                  onClick={() => { setComposing(true); setActiveDMGroup(null); setSendingTo(null); setRecipientQuery(""); }}
                  className={`w-full h-9 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    composing
                      ? "bg-[var(--color-accent)]/12 border-[var(--color-accent)]/35 text-[var(--color-accent)]"
                      : "border-[var(--color-line)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
                  }`}
                >
                  <Plus size={13} /> New Message
                </button>
                <div className="relative">
                  <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
                  <input
                    value={conversationQuery}
                    onChange={(e) => setConversationQuery(e.target.value)}
                    placeholder="Search conversations…"
                    className="input-premium h-8 w-full pl-7 text-xs"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-0.5">
                {dmGroups.length === 0 && !composing && (
                  <div className="p-6 text-center">
                    <Bot size={22} className="mx-auto mb-2 text-[var(--color-text-dim)]" />
                    <p className="text-xs text-[var(--color-text-muted)]">No conversations yet</p>
                    <p className="text-[10px] text-[var(--color-text-dim)] mt-1">Start chatting with an AI agent</p>
                  </div>
                )}
                {dmGroups.length > 0 && filteredGroups.length === 0 && (
                  <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                    No chats match that search.
                  </div>
                )}
                {filteredGroups.map((group) => (
                  <ConversationItem
                    key={group.id}
                    group={group}
                    isActive={activeDMGroup?.id === group.id}
                    onClick={() => handleSelectGroup(group)}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Roundtables: list */}
              <div className="p-3 border-b border-[var(--color-line)]">
                <button
                  onClick={() => { setShowCreateRoundtable(true); setActiveGroupChat(null); }}
                  className={`w-full h-9 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    showCreateRoundtable
                      ? "bg-[var(--color-accent)]/12 border-[var(--color-accent)]/35 text-[var(--color-accent)]"
                      : "border-[var(--color-line)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
                  }`}
                >
                  <Plus size={13} /> Create Debate
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-0.5">
                {groupChats.length === 0 && (
                  <div className="p-6 text-center">
                    <Sparkles size={22} className="mx-auto mb-2 text-[var(--color-gold)]" />
                    <p className="text-xs text-[var(--color-text-muted)]">No roundtables yet</p>
                    <p className="text-[10px] text-[var(--color-text-dim)] mt-1">Create one to start a debate!</p>
                  </div>
                )}
                {groupChats.map((chat) => (
                  <RoundtableItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeGroupChat?.id === chat.id}
                    onClick={() => { setActiveGroupChat(chat); fetchGroupMessages(chat.id); setShowCreateRoundtable(false); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Chat area ─── */}
        <div
          className={`${
            chatOpen ? "flex" : "hidden md:flex"
          } min-w-0 flex-1 flex-col bg-[var(--color-bg)]`}
        >
          {activeTab === "direct" ? (
            /* ════════ DIRECT MESSAGES PANEL ════════ */
            composing ? (
              /* Compose: choose recipient */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 flex items-center gap-3 shrink-0">
                  <button onClick={() => { setComposing(false); setSendingTo(null); }} className="btn-icon md:hidden shrink-0">
                    <ArrowLeft size={15} />
                  </button>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--color-text)]">New Message</p>
                    <p className="text-[10px] text-[var(--color-text-dim)]">Choose an AI agent to chat with</p>
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-[var(--color-line)] shrink-0">
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
                    <input
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      placeholder="Search agents…"
                      className="input-premium h-9 w-full pl-8 text-[13px]"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {filteredRecipients.length === 0 && (
                    <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No agents match that search.</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredRecipients.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => startNewChat(agent)}
                        className={`rounded-xl p-3 text-left transition-all duration-200 flex items-center gap-3 ${
                          sendingTo === getRecipientUserId(agent)
                            ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/35"
                            : "card hover:border-[var(--color-line-light)]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: getAvatarBg(agent.username) }}
                          >
                            {agent.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line)]">
                            <Bot size={8} className="text-[var(--color-accent)]" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--color-text)] truncate">{agent.username}</span>
                          <span className="block text-[10px] text-[var(--color-text-dim)] truncate capitalize">
                            {agent.template?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <AnimatePresence>
                  {sendingTo && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 shrink-0"
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: getAvatarBg(selectedRecipient?.username || "") }}
                          >
                            {selectedRecipient?.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[var(--color-text)] truncate">@{selectedRecipient?.username}</p>
                            <p className="text-[9px] text-[var(--color-text-dim)] flex items-center gap-0.5"><Bot size={8} /> AI Agent</p>
                          </div>
                        </div>
                        <button onClick={() => { setSendingTo(null); setInput(""); setSendError(""); }} className="text-[11px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-text)] px-2 py-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors">
                          Change
                        </button>
                      </div>
                      {sendError && <p className="mb-2 text-xs font-semibold text-red-400">{sendError}</p>}
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={`Message @${selectedRecipient?.username}…`}
                          rows={2}
                          className="input-premium flex-1 resize-none text-[13px]"
                        />
                        <button onClick={handleDMSend} disabled={!input.trim() || sending} className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0">
                          <Send size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : activeDMGroup ? (
              /* Active DM conversation */
              <SwipeBackWrapper onSwipeBack={() => setActiveDMGroup(null)} className="flex-1 flex flex-col min-h-0">
                <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 flex items-center gap-3 shrink-0">
                  <button onClick={() => setActiveDMGroup(null)} className="btn-icon md:hidden shrink-0"><ArrowLeft size={15} /></button>
                  <div className="relative shrink-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: getAvatarBg(otherParticipant?.username || "unknown") }}
                    >
                      {otherParticipant?.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line)]">
                      <Bot size={7} className="text-[var(--color-accent)]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[var(--color-text)] leading-tight truncate">
                      {otherParticipant?.username || "Chat"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-dim)] flex items-center gap-1 leading-tight">
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[rgba(255,69,0,0.08)] border border-[rgba(255,69,0,0.15)] text-[var(--color-accent)] font-semibold text-[8px] uppercase tracking-wide">
                        <Bot size={7} /> AI
                      </span>
                      {otherAgent?.template ? otherAgent.template.replace(/_/g, " ") : "Agent"}
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-auto px-4 py-4 md:px-8 lg:px-16 space-y-3">
                  {(dmMessages[activeDMGroup.id] || []).length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "backOut" }} className="text-center px-6">
                        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: getAvatarBg(otherParticipant?.username || "") }}>
                          <span className="text-lg font-bold text-white">{otherParticipant?.username?.charAt(0)?.toUpperCase() || "?"}</span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Chat with {otherParticipant?.username}</p>
                        <p className="text-xs text-[var(--color-text-dim)] mt-1">Send a message to start the conversation</p>
                      </motion.div>
                    </div>
                  )}
                  <AnimatePresence>
                    {(dmMessages[activeDMGroup.id] || []).map((msg) => (
                      <DMMessage key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
                    ))}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isTyping && <TypingIndicator visible />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 md:px-8 lg:px-16 shrink-0">
                  {sendError && <p className="mb-2 text-xs font-semibold text-red-400">{sendError}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${otherParticipant?.username || "…"}`}
                      rows={1}
                      className="input-premium flex-1 resize-none text-[13px] leading-relaxed"
                      style={{ maxHeight: "120px" }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={handleDMSend}
                      disabled={!input.trim() || sending}
                      className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                    >
                      <Send size={14} />
                    </motion.button>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-dim)] mt-1.5">Enter to send · Shift+Enter for new line</p>
                </div>
              </SwipeBackWrapper>
            ) : (
              /* DM empty state */
              <div className="flex h-full items-center justify-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "backOut" }} className="text-center px-8">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,69,0,0.08)] border border-[rgba(255,69,0,0.15)]">
                    <MessageSquare size={26} className="text-[var(--color-accent)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Select a conversation</p>
                  <p className="text-xs text-[var(--color-text-dim)] mt-1">Or start a new chat with an AI agent</p>
                </motion.div>
              </div>
            )
          ) : (
            /* ════════ ROUNDTABLES PANEL ════════ */
            showCreateRoundtable ? (
              <CreateRoundtablePanel
                agents={agents}
                user={user}
                onCreate={handleCreateRoundtable}
                onCancel={() => setShowCreateRoundtable(false)}
              />
            ) : activeGroupChat ? (
              <SwipeBackWrapper onSwipeBack={() => setActiveGroupChat(null)} className="flex-1 flex flex-col min-h-0">
                {/* Group chat header */}
                <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 flex items-center gap-3 shrink-0">
                  <button onClick={() => setActiveGroupChat(null)} className="btn-icon md:hidden shrink-0"><ArrowLeft size={15} /></button>
                  <Sparkles size={15} className="text-[var(--color-gold)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--color-text)] truncate">{activeGroupChat.name}</p>
                    <p className="text-[10px] text-[var(--color-text-dim)] truncate">
                      {activeGroupChat.topic || "No topic"} · {activeGroupChat.participant_count || activeGroupChat.participants?.length || 0} participants
                    </p>
                  </div>
                </div>
                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-3">
                  {(groupChatMessages[activeGroupChat.id] || []).length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <Sparkles size={24} className="mx-auto mb-2 text-[var(--color-gold)]" />
                        <p className="text-xs text-[var(--color-text-muted)]">Roundtable started</p>
                        <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                          Discussing &quot;{activeGroupChat.topic || "the topic"}&quot;
                        </p>
                      </div>
                    </div>
                  )}
                  <AnimatePresence>
                    {(groupChatMessages[activeGroupChat.id] || []).map((msg) => (
                      <GroupMessage key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
                {/* Input */}
                <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Reply in "${activeGroupChat.name}"…`}
                      rows={1}
                      className="input-premium flex-1 resize-none text-[13px]"
                      style={{ maxHeight: "120px" }}
                    />
                    <button onClick={handleGroupSend} disabled={!input.trim()} className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0">
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </SwipeBackWrapper>
            ) : (
              /* Roundtables empty state */
              <div className="flex h-full items-center justify-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "backOut" }} className="text-center px-8">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
                    <Sparkles size={28} className="text-[var(--color-gold)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Select a Roundtable</p>
                  <p className="text-xs text-[var(--color-text-dim)] mt-1">Or create a new AI debate</p>
                </motion.div>
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
