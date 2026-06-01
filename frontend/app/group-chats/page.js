"use client";

import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Send,
  Users,
  Bot,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSimulationStore } from "../../store/useSimulationStore";

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

function ChatMessage({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {!isOwn && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white mt-0.5"
          style={{ background: getAvatarGradient(msg.sender_username || "unknown") }}
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
          <p className="text-[10px] font-semibold text-[var(--color-accent)] mb-0.5">
            {msg.sender_username}
          </p>
        )}
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`text-[9px] mt-1 tabular-nums ${isOwn ? "text-white/50" : "text-[var(--color-text-dim)]"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

export default function GroupChatsPage() {
  const user = useSimulationStore((s) => s.user);
  const token = useSimulationStore((s) => s.token);
  const agents = useSimulationStore((s) => s.agents);
  const groupChats = useSimulationStore((s) => s.groupChats);
  const groupChatMessages = useSimulationStore((s) => s.groupChatMessages);
  const activeGroupChat = useSimulationStore((s) => s.activeGroupChat);
  const fetchGroupChats = useSimulationStore((s) => s.fetchGroupChats);
  const createGroupChat = useSimulationStore((s) => s.createGroupChat);
  const setActiveGroupChat = useSimulationStore((s) => s.setActiveGroupChat);
  const fetchGroupMessages = useSimulationStore((s) => s.fetchGroupMessages);
  const sendGroupMessage = useSimulationStore((s) => s.sendGroupMessage);

  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [chatName, setChatName] = useState("");
  const [chatTopic, setChatTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (token) fetchGroupChats();
  }, [token, fetchGroupChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupChatMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeGroupChat) return;
    await sendGroupMessage(activeGroupChat.id, input.trim());
    setInput("");
    fetchGroupMessages(activeGroupChat.id);
  }, [input, activeGroupChat, sendGroupMessage, fetchGroupMessages]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCreate = useCallback(async () => {
    if (!chatName.trim()) return;
    const participantIds = selectedAgents.map(a => a.id);
    if (user) participantIds.push(user.id);
    await createGroupChat(chatName.trim(), chatTopic.trim(), participantIds);
    setShowCreate(false);
    setChatName("");
    setChatTopic("");
    setSelectedAgents([]);
  }, [chatName, chatTopic, selectedAgents, user, createGroupChat]);

  const toggleAgent = useCallback((agent) => {
    setSelectedAgents(prev =>
      prev.find(a => a.id === agent.id)
        ? prev.filter(a => a.id !== agent.id)
        : [...prev, agent]
    );
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl flex flex-col h-full min-h-0"
    >
      {/* Header */}
      <div className="border-b border-[var(--color-line)] glass-strong px-4 md:px-6 h-11 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/feed" className="btn-icon">
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-bold text-[var(--color-text)]">AI Roundtables</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary h-8 text-xs">
          <Plus size={14} /> Create Debate
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[var(--color-line)] bg-[var(--color-bg-secondary)] flex flex-col">
          <div className="p-3 border-b border-[var(--color-line)])">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
              Active Roundtables
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {groupChats.length === 0 && (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                No roundtables yet.<br />
                Create one to start a debate!
              </div>
            )}
            {groupChats.map((chat) => {
              const participantCount = chat.participant_count || chat.participants?.length || 0;
              return (
                <button
                  key={chat.id}
                  onClick={() => { setActiveGroupChat(chat); fetchGroupMessages(chat.id); }}
                  className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
                    activeGroupChat?.id === chat.id
                      ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30"
                      : "hover:bg-[var(--color-panel)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-[var(--color-gold)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                      {chat.name}
                    </span>
                  </div>
                  {chat.topic && (
                    <p className="text-[10px] text-[var(--color-text-dim)] line-clamp-2 mt-0.5">
                      {chat.topic}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[9px] text-[var(--color-text-muted)]">
                    <Users size={10} />
                    <span>{participantCount} participants</span>
                    <span className="ml-auto">{chat.message_count || 0} msgs</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-[var(--color-bg)]">
          {showCreate ? (
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-lg mx-auto space-y-5">
                <h2 className="text-lg font-bold text-[var(--color-text)]">Create Roundtable</h2>
                <p className="text-xs text-[var(--color-text-dim)]">Invite participants to debate a topic in a private chat.</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Room Name</label>
                  <input
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    placeholder="e.g., Crypto vs Philosophy"
                    className="input-premium text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Debate Topic</label>
                  <textarea
                    value={chatTopic}
                    onChange={(e) => setChatTopic(e.target.value)}
                    placeholder="e.g., Is Bitcoin the future or a scam?"
                    rows={2}
                    className="input-premium text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Select Participants ({selectedAgents.length} selected)
                  </label>
                  <div className="space-y-1.5 max-h-60 overflow-auto">
                    {agents.filter(a => a.id !== user?.id).map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent)}
                        className={`w-full rounded-xl p-3 text-left transition-all duration-200 flex items-center gap-3 ${
                          selectedAgents.find(a => a.id === agent.id)
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
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-[var(--color-text)]">{agent.username}</span>
                            <Bot size={12} className="text-[var(--color-accent)]" />
                          </div>
                          <p className="text-[11px] text-[var(--color-text-dim)] truncate">
                            {agent.template?.replace(/_/g, " ")}
                          </p>
                        </div>
                        {selectedAgents.find(a => a.id === agent.id) && (
                          <X size={14} className="text-[var(--color-accent)] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 h-10">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!chatName.trim() || selectedAgents.length < 2}
                    className="btn-primary flex-1 h-10"
                  >
                    <Sparkles size={15} /> Launch Roundtable
                  </button>
                </div>
              </div>
            </div>
          ) : activeGroupChat ? (
            <>
              {/* Chat header */}
              <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 flex items-center gap-3">
                <Sparkles size={16} className="text-[var(--color-gold)]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{activeGroupChat.name}</p>
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
                        Participants are discussing &quot;{activeGroupChat.topic || "the topic"}&quot;
                      </p>
                    </div>
                  </div>
                )}
                <AnimatePresence>
                  {(groupChatMessages[activeGroupChat.id] || []).map((msg) => (
                    <ChatMessage key={msg.id} msg={msg} isOwn={msg.sender_id === user?.id} />
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-[var(--color-line)] p-4 bg-[var(--color-panel)]">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Reply in "${activeGroupChat.name}"...`}
                    rows={2}
                    className="input-premium flex-1 resize-none text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="btn-primary h-9 w-9 p-0 flex items-center justify-center shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]"
                >
                  <Sparkles size={32} className="text-[var(--color-gold)]" />
                </motion.div>
                <p className="text-sm text-[var(--color-text-muted)]">Select a roundtable</p>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">Or create a new AI debate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
