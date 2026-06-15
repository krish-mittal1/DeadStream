"use client";

import {
  ArrowLeft,
  MessageSquare,
  Send,
  Search,
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
  const i = (username || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarGradients[i % avatarGradients.length];
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
            className="w-[6px] h-[6px] rounded-full bg-[var(--color-text-dim)]"
            animate={{
              y: [0, -4, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[var(--color-text-dim)]">typing...</span>
    </motion.div>
  );
}

function DMMessage({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar for incoming messages */}
      {!isOwn && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-1"
          style={{ background: getAvatarGradient(msg.sender_username) }}
        >
          {msg.sender_username?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <div
        className={`max-w-[min(72%,560px)] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "bg-[var(--color-accent)] text-white rounded-br-md shadow-[0_2px_8px_rgba(255,69,0,0.2)]"
            : "bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-text)] rounded-bl-md"
        }`}
      >
        {!isOwn && (
          <p className="text-[10px] font-semibold text-[var(--color-accent)] mb-1">
            {msg.sender_username}
          </p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
          {msg.body}
        </p>
        <p className={`text-[10px] mt-1 tabular-nums ${
          isOwn ? "text-white/50" : "text-[var(--color-text-dim)]"
        }`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

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
  const composeInputRef = useRef(null);

  const selectedRecipient = useMemo(
    () => agents.find((agent) => getRecipientUserId(agent) === sendingTo || agent.id === sendingTo),
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
    if (sendingTo) {
      composeInputRef.current?.focus();
    }
  }, [sendingTo]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setSendError("");
    try {
      if (composing && sendingTo) {
        const msg = await sendDM(sendingTo, input.trim());
        setInput("");
        if (msg) {
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
        } else {
          setSendError("Message failed. Try again.");
        }
      } else if (activeDMGroup) {
        const other = getOtherParticipant(activeDMGroup, user?.id);
        if (other) {
          const msg = await sendDM(other.id, input.trim());
          setInput("");
          if (msg) {
            await fetchDMMessages(activeDMGroup.id);
            fetchDMGroups();
            setTyping(true);
            setTimeout(() => {
              setTyping(false);
              fetchDMMessages(activeDMGroup.id);
            }, 3000);
          } else {
            setSendError("Message failed. Try again.");
          }
        }
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, composing, sendingTo, sendDM, activeDMGroup, user, selectedRecipient, fetchDMMessages, setActiveDMGroup, fetchDMGroups]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const startNewChat = useCallback((agent) => {
    setSendingTo(getRecipientUserId(agent));
    setComposing(true);
    setActiveDMGroup(null);
    setSendError("");
  }, [setActiveDMGroup]);

  const handleSelectGroup = useCallback((group) => {
    setActiveDMGroup(group);
    setComposing(false);
    setSendingTo(null);
    setSendError("");
    fetchDMMessages(group.id);
  }, [setActiveDMGroup, fetchDMMessages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-0px)] min-h-0 w-full flex-col overflow-hidden border-x border-[var(--color-line)] bg-[var(--color-bg)]"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="btn-icon">
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-bold text-[var(--color-text)]">Direct Messages</h1>
        </div>
        {dmUnread > 0 && (
          <span className="badge">{dmUnread} unread</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar - full width on mobile, sidebar on desktop */}
        <div className={`${activeDMGroup ? "hidden md:flex" : "flex"} w-full md:w-[320px] border-r border-[var(--color-line)] bg-[var(--color-bg-secondary)] flex-col`}>
          {/* Compose button */}
          <div className="p-3 border-b border-[var(--color-line)]">
            <button
              onClick={() => { setComposing(true); setActiveDMGroup(null); setSendingTo(null); }}
              className={`w-full btn-secondary h-9 text-xs ${composing ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]" : ""}`}
            >
              <MessageSquare size={14} /> New Message
            </button>
            <div className="relative mt-2">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
              <input
                value={conversationQuery}
                onChange={(e) => setConversationQuery(e.target.value)}
                placeholder="Search chats..."
                className="input-premium h-9 w-full pl-8 text-xs"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {!user && (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                Log in to message people
              </div>
            )}
            {user && dmGroups.length === 0 && !composing && (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                No conversations yet.<br />
                Start one with someone!
              </div>
            )}
            {user && dmGroups.length > 0 && filteredGroups.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                No chats match that search.
              </div>
            )}
            {filteredGroups.map((group) => {
              const other = getOtherParticipant(group, user?.id);
              const lastMsg = group.last_message;
              return (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
                    activeDMGroup?.id === group.id
                      ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                      : "hover:bg-[var(--color-panel)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: getAvatarGradient(other?.username || "unknown") }}
                    >
                      {other?.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                          {other?.username || "Unknown"}
                        </span>
                      </div>
                      {lastMsg && (
                        <p className="text-[10px] text-[var(--color-text-dim)] truncate mt-0.5">
                          {lastMsg?.slice(0, 60)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area - full screen on mobile when active or composing */}
        <div className={`${activeDMGroup || composing ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[var(--color-bg)]`}>
          {composing ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-[var(--color-line)]">
                <h2 className="text-sm font-bold text-[var(--color-text)]">New Message</h2>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">Select a person to message</p>
                <div className="relative mt-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
                  <input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Search people..."
                    className="input-premium h-10 w-full pl-9 text-sm"
                    autoFocus
                  />
                </div>
                {sendingTo && (
                  <div className="mt-4 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                          Message
                        </p>
                        <p className="truncate text-sm font-bold text-[var(--color-text)]">
                          @{selectedRecipient?.username}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSendingTo(null);
                          setInput("");
                          setSendError("");
                        }}
                        className="text-xs font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                      >
                        Change
                      </button>
                    </div>
                    {sendError && (
                      <p className="mb-2 text-xs font-semibold text-red-400">{sendError}</p>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        ref={composeInputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={2}
                        className="input-premium flex-1 resize-none text-sm"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                        title="Send message"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2 overflow-auto p-3 lg:grid-cols-2">
                {filteredRecipients.length === 0 && (
                  <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                    No people match that search.
                  </div>
                )}
                {filteredRecipients.map((agent) => (
                  <button
                      key={agent.id}
                      onClick={() => startNewChat(agent)}
                      className={`w-full rounded-xl p-3 text-left transition-all duration-200 flex items-center gap-3 ${
                      sendingTo === getRecipientUserId(agent)
                        ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                        : "card hover:border-[var(--color-line-light)]"
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: getAvatarGradient(agent.username) }}
                    >
                      {agent.username?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                          {agent.username}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-dim)]">
                        {agent.template?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : activeDMGroup ? (
            <SwipeBackWrapper onSwipeBack={() => setActiveDMGroup(null)} className="flex-1 flex flex-col">
              {/* Chat header */}
              <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setActiveDMGroup(null)}
                  className="btn-icon md:hidden shrink-0"
                  title="Back to conversations"
                >
                  <ArrowLeft size={16} />
                </button>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: getAvatarGradient(getOtherParticipant(activeDMGroup, user?.id)?.username || "unknown") }}
                >
                  {getOtherParticipant(activeDMGroup, user?.id)?.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {getOtherParticipant(activeDMGroup, user?.id)?.username || "Chat"}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-dim)]">Messages</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto px-5 py-4 md:px-8 lg:px-12 space-y-3">
                {(dmMessages[activeDMGroup.id] || []).length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <MessageSquare size={24} className="mx-auto mb-2 text-[var(--color-text-dim)]" />
                      <p className="text-xs text-[var(--color-text-muted)]">No messages yet</p>
                      <p className="text-[10px] text-[var(--color-text-dim)] mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                )}
                <AnimatePresence>
                  {(dmMessages[activeDMGroup.id] || []).map((msg) => (
                    <DMMessage key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
                  ))}
                </AnimatePresence>
                <TypingIndicator visible={typing} />
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 md:px-8 lg:px-12">
                {sendError && (
                  <p className="mb-2 text-xs font-semibold text-red-400">{sendError}</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={2}
                    className="input-premium flex-1 resize-none text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </SwipeBackWrapper>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]"
                >
                  <MessageSquare size={32} className="text-[var(--color-text-muted)]" />
                </motion.div>
                <p className="text-sm text-[var(--color-text-muted)]">Select a conversation</p>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">Or start a new conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
