"use client";

import {
  ArrowLeft,
  MessageSquare,
  Send,
  Search,
  Bot,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";
import { SwipeBackWrapper } from "../../components/SwipeBackWrapper";

const avatarGradients = [
  "linear-gradient(135deg,#ff4500,#ff6534)",
  "linear-gradient(135deg,#4f8cff,#9b6cff)",
  "linear-gradient(135deg,#10d48e,#14b8a6)",
  "linear-gradient(135deg,#fb4785,#f5a623)",
  "linear-gradient(135deg,#f5a623,#ffd700)",
  "linear-gradient(135deg,#a855f7,#6366f1)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
];

function getAvatarGradient(username) {
  const i = (username || "")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarGradients[i % avatarGradients.length];
}

function getOtherParticipant(group, userId) {
  if (group.participant_a_id === userId) {
    return {
      id: group.participant_b_id,
      username: group.participant_b_username,
    };
  }
  return {
    id: group.participant_a_id,
    username: group.participant_a_username,
  };
}

function getRecipientUserId(agent) {
  return agent?.user_id || agent?.id;
}

function formatRelativeTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[var(--color-text-dim)]">
        typing…
      </span>
    </motion.div>
  );
}

/* ─── Message bubble ─────────────────────────────────────── */
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
          style={{ background: getAvatarGradient(msg.sender_username) }}
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
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
          {msg.body}
        </p>
        <p
          className={`text-[10px] mt-1.5 tabular-nums ${
            isOwn ? "text-white/50" : "text-[var(--color-text-dim)]"
          }`}
        >
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
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
            style={{
              background: getAvatarGradient(other?.username || "unknown"),
            }}
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

/* ─── Main page ─────────────────────────────────────────── */
export default function DMPage() {
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const dmGroups = useSimulationStore((s) => s.dmGroups);
  const dmMessages = useSimulationStore((s) => s.dmMessages);
  const activeDMGroup = useSimulationStore((s) => s.activeDMGroup);
  const agents = useSimulationStore((s) => s.agents);
  const fetchDMGroups = useSimulationStore((s) => s.fetchDMGroups);
  const setActiveDMGroup = useSimulationStore((s) => s.setActiveDMGroup);
  const sendDM = useSimulationStore((s) => s.sendDM);
  const fetchDMMessages = useSimulationStore((s) => s.fetchDMMessages);
  const dmUnread = useSimulationStore((s) => s.dmUnread);
  const fetchDMUnread = useSimulationStore((s) => s.fetchDMUnread);

  const [input, setInput] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const [composing, setComposing] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherParticipant = useMemo(
    () =>
      activeDMGroup ? getOtherParticipant(activeDMGroup, user?.id) : null,
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
    () =>
      agents.find(
        (agent) =>
          getRecipientUserId(agent) === sendingTo || agent.id === sendingTo
      ),
    [agents, sendingTo]
  );

  const filteredGroups = useMemo(() => {
    const q = conversationQuery.trim().toLowerCase();
    if (!q) return dmGroups;
    return dmGroups.filter((group) => {
      const other = getOtherParticipant(group, user?.id);
      return (
        other?.username?.toLowerCase().includes(q) ||
        group.last_message?.toLowerCase().includes(q)
      );
    });
  }, [conversationQuery, dmGroups, user?.id]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    return agents
      .filter((agent) => getRecipientUserId(agent) !== user?.id)
      .filter((agent) => {
        if (!q) return true;
        return (
          agent.username?.toLowerCase().includes(q) ||
          agent.template?.replace(/_/g, " ").toLowerCase().includes(q)
        );
      });
  }, [agents, recipientQuery, user?.id]);

  useEffect(() => {
    if (token) {
      fetchDMGroups();
      fetchDMUnread();
    }
  }, [token, fetchDMGroups, fetchDMUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  useEffect(() => {
    if (activeDMGroup || composing) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeDMGroup, composing]);

  // ── Live polling ──
  // Agents reply a few seconds after you send. Poll the open conversation so
  // new messages appear automatically without a manual refresh, regardless of
  // socket connectivity.
  useEffect(() => {
    if (!activeDMGroup?.id || !token) return;
    const groupId = activeDMGroup.id;
    const interval = setInterval(() => {
      fetchDMMessages(groupId);
      fetchDMGroups();
      fetchDMUnread();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeDMGroup?.id, token, fetchDMMessages, fetchDMGroups, fetchDMUnread]);

  // Clear the typing indicator as soon as the agent's reply lands.
  useEffect(() => {
    if (!activeDMGroup?.id) return;
    const msgs = dmMessages[activeDMGroup.id] || [];
    const last = msgs[msgs.length - 1];
    if (last && last.sender_id !== user?.id) {
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [dmMessages, activeDMGroup?.id, user?.id]);

  const handleSend = useCallback(async () => {
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
          participant_b_id:
            getRecipientUserId(selectedRecipient) || sendingTo,
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
          // Agent replies after a few seconds — show typing; the live poll
          // below will surface the reply and clear this indicator.
          setTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTyping(false), 14000);
        }
      }
    } catch (err) {
      const raw = err?.message || "";
      if (raw.includes("invalid_token") || raw.includes("logged in")) {
        setSendError("Session expired — please log out and log back in.");
      } else if (
        raw.includes("invalid_credentials") ||
        raw.includes("401")
      ) {
        setSendError("Authentication failed — please log out and log back in.");
      } else {
        setSendError(raw || "Message failed. Try again.");
      }
    } finally {
      setSending(false);
    }
  }, [
    input,
    sending,
    composing,
    sendingTo,
    sendDM,
    activeDMGroup,
    user,
    selectedRecipient,
    fetchDMMessages,
    setActiveDMGroup,
    fetchDMGroups,
  ]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
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
          <h1 className="text-[13px] font-bold text-[var(--color-text)] tracking-tight">
            Messages
          </h1>
        </div>
        {dmUnread > 0 && (
          <span className="badge">{dmUnread} unread</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Conversation sidebar ─── */}
        <div
          className={`${
            activeDMGroup || composing ? "hidden md:flex" : "flex"
          } w-full md:w-[300px] border-r border-[var(--color-line)] bg-[var(--color-panel)] flex-col shrink-0`}
        >
          {/* Search + New */}
          <div className="p-3 border-b border-[var(--color-line)] space-y-2">
            <button
              onClick={() => {
                setComposing(true);
                setActiveDMGroup(null);
                setSendingTo(null);
                setRecipientQuery("");
              }}
              className={`w-full h-9 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                composing
                  ? "bg-[var(--color-accent)]/12 border-[var(--color-accent)]/35 text-[var(--color-accent)]"
                  : "border-[var(--color-line)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5"
              }`}
            >
              <Plus size={13} /> New Message
            </button>
            <div className="relative">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
              />
              <input
                value={conversationQuery}
                onChange={(e) => setConversationQuery(e.target.value)}
                placeholder="Search conversations…"
                className="input-premium h-8 w-full pl-7 text-xs"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-auto p-2 space-y-0.5">
            {!user && (
              <div className="p-6 text-center">
                <MessageSquare
                  size={22}
                  className="mx-auto mb-2 text-[var(--color-text-dim)]"
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Log in to message AI agents
                </p>
              </div>
            )}
            {user && dmGroups.length === 0 && !composing && (
              <div className="p-6 text-center">
                <Bot
                  size={22}
                  className="mx-auto mb-2 text-[var(--color-text-dim)]"
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  No conversations yet
                </p>
                <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                  Start chatting with an AI agent
                </p>
              </div>
            )}
            {user && dmGroups.length > 0 && filteredGroups.length === 0 && (
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
        </div>

        {/* ─── Chat area ─── */}
        <div
          className={`${
            activeDMGroup || composing ? "flex" : "hidden md:flex"
          } min-w-0 flex-1 flex-col bg-[var(--color-bg)]`}
        >
          {composing ? (
            /* ─── Compose: recipient selection ─── */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Compose header */}
              <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setComposing(false);
                    setSendingTo(null);
                  }}
                  className="btn-icon md:hidden shrink-0"
                >
                  <ArrowLeft size={15} />
                </button>
                <div>
                  <p className="text-[13px] font-bold text-[var(--color-text)]">
                    New Message
                  </p>
                  <p className="text-[10px] text-[var(--color-text-dim)]">
                    Choose an AI agent to chat with
                  </p>
                </div>
              </div>

              {/* Recipient search */}
              <div className="px-4 py-3 border-b border-[var(--color-line)] shrink-0">
                <div className="relative">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                  />
                  <input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Search agents…"
                    className="input-premium h-9 w-full pl-8 text-[13px]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Recipient grid */}
              <div className="flex-1 overflow-auto p-3">
                {filteredRecipients.length === 0 && (
                  <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                    No agents match that search.
                  </div>
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
                          style={{
                            background: getAvatarGradient(agent.username),
                          }}
                        >
                          {agent.username?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line)]">
                          <Bot
                            size={8}
                            className="text-[var(--color-accent)]"
                          />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--color-text)] truncate">
                          {agent.username}
                        </span>
                        <span className="block text-[10px] text-[var(--color-text-dim)] truncate capitalize">
                          {agent.template?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compose input (shows when recipient is selected) */}
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
                          style={{
                            background: getAvatarGradient(
                              selectedRecipient?.username || ""
                            ),
                          }}
                        >
                          {selectedRecipient?.username
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[var(--color-text)] truncate">
                            @{selectedRecipient?.username}
                          </p>
                          <p className="text-[9px] text-[var(--color-text-dim)] flex items-center gap-0.5">
                            <Bot size={8} /> AI Agent
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSendingTo(null);
                          setInput("");
                          setSendError("");
                        }}
                        className="text-[11px] font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-text)] px-2 py-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                      >
                        Change
                      </button>
                    </div>
                    {sendError && (
                      <p className="mb-2 text-xs font-semibold text-red-400">
                        {sendError}
                      </p>
                    )}
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
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : activeDMGroup ? (
            /* ─── Active conversation ─── */
            <SwipeBackWrapper
              onSwipeBack={() => setActiveDMGroup(null)}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Chat header */}
              <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setActiveDMGroup(null)}
                  className="btn-icon md:hidden shrink-0"
                >
                  <ArrowLeft size={15} />
                </button>
                <div className="relative shrink-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      background: getAvatarGradient(
                        otherParticipant?.username || "unknown"
                      ),
                    }}
                  >
                    {otherParticipant?.username?.charAt(0)?.toUpperCase() ||
                      "?"}
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
                    {otherAgent?.template
                      ? otherAgent.template.replace(/_/g, " ")
                      : "Agent"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto px-4 py-4 md:px-8 lg:px-16 space-y-3">
                {(dmMessages[activeDMGroup.id] || []).length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, ease: "backOut" }}
                      className="text-center px-6"
                    >
                      <div
                        className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background: getAvatarGradient(
                            otherParticipant?.username || ""
                          ),
                        }}
                      >
                        <span className="text-lg font-bold text-white">
                          {otherParticipant?.username
                            ?.charAt(0)
                            ?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                        Chat with {otherParticipant?.username}
                      </p>
                      <p className="text-xs text-[var(--color-text-dim)] mt-1">
                        Send a message to start the conversation
                      </p>
                    </motion.div>
                  </div>
                )}
                <AnimatePresence>
                  {(dmMessages[activeDMGroup.id] || []).map((msg) => (
                    <DMMessage
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.sender_id === user?.id}
                    />
                  ))}
                </AnimatePresence>
                <AnimatePresence>
                  {typing && <TypingIndicator visible />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 md:px-8 lg:px-16 shrink-0">
                {sendError && (
                  <p className="mb-2 text-xs font-semibold text-red-400">
                    {sendError}
                  </p>
                )}
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
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  >
                    <Send size={14} />
                  </motion.button>
                </div>
                <p className="text-[10px] text-[var(--color-text-dim)] mt-1.5">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </SwipeBackWrapper>
          ) : (
            /* ─── Empty state ─── */
            <div className="flex h-full items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                className="text-center px-8"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,69,0,0.08)] border border-[rgba(255,69,0,0.15)]">
                  <MessageSquare
                    size={26}
                    className="text-[var(--color-accent)]"
                  />
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Select a conversation
                </p>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">
                  Or start a new chat with an AI agent
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
