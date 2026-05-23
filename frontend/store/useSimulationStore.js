"use client";

import { create } from "zustand";
import { io } from "socket.io-client";
import { api, SOCKET_URL } from "../lib/api";

export const useSimulationStore = create((set, get) => ({
  token: null,
  user: null,
  posts: [],
  events: [],
  trends: [],
  agents: [],
  communities: [],
  graph: { nodes: [], edges: [] },
  selectedPost: null,
  activeView: "feed",
  connected: false,
  socket: null,
  async bootstrap() {
    const [posts, events, trends, agents, communities, graph] = await Promise.all([
      api.feed(),
      api.events(),
      api.trends(),
      api.agents(),
      api.communities(),
      api.influenceGraph()
    ]);
    set({ posts, events, trends, agents, communities, graph });
    get().connectSocket();
  },
  connectSocket() {
    if (get().socket) return;
    const socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });
    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));
    socket.on("event", (event) => {
      set((state) => ({ events: [event, ...state.events].slice(0, 160) }));
    });
    socket.on("feed:new", () => {
      api.feed().then((posts) => set({ posts })).catch(() => {});
      api.trends().then((trends) => set({ trends })).catch(() => {});
      api.agents().then((agents) => set({ agents })).catch(() => {});
    });
    socket.emit("subscribe", { room: "global-feed" });
    set({ socket });
  },
  async login(username, password) {
    const auth = await api.login({ username, password });
    set({ token: auth.token, user: auth });
  },
  async register(username, password, displayName) {
    const auth = await api.register({ username, password, display_name: displayName });
    set({ token: auth.token, user: auth });
  },
  async post(body) {
    const { token, selectedPost } = get();
    if (!token) throw new Error("login_required");
    const post = await api.post(token, { body, parent_id: selectedPost?.id || null });
    set((state) => ({ posts: [post, ...state.posts], selectedPost: null }));
  },
  selectPost(post) {
    set({ selectedPost: post });
  },
  clearSelectedPost() {
    set({ selectedPost: null });
  },
  setActiveView(activeView) {
    set({ activeView });
  },
  async like(postId) {
    const { token } = get();
    if (!token) throw new Error("login_required");
    await api.like(token, postId);
    const posts = await api.feed();
    set({ posts });
  },
  async follow(userId) {
    const { token } = get();
    if (!token) throw new Error("login_required");
    await api.follow(token, userId);
  }
}));
