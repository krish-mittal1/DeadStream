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
  selectedProfile: null,
  selectedCommunity: null,
  threadReplies: [],
  communityPosts: [],
  panelError: "",
  activeView: "feed",
  connected: false,
  loading: true,
  socket: null,
  async bootstrap() {
    set({ loading: true });
    try {
      const [posts, events, trends, agents, communities, graph] = await Promise.all([
        api.feed(),
        api.events(),
        api.trends(),
        api.agents(),
        api.communities(),
        api.influenceGraph()
      ]);
      set({ posts, events, trends, agents, communities, graph, loading: false });
    } catch (err) {
      set({ loading: false, panelError: "Failed to load simulation data" });
    }
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
  async openThread(post) {
    set({ selectedPost: post, panelError: "" });
    const threadReplies = await api.postReplies(post.id);
    set({ threadReplies });
  },
  closeThread() {
    set({ selectedPost: null, threadReplies: [] });
  },
  async openProfile(userId) {
    set({ panelError: "" });
    const selectedProfile = await api.userProfile(userId);
    set({ selectedProfile });
  },
  closeProfile() {
    set({ selectedProfile: null });
  },
  async openCommunity(community) {
    set({ selectedCommunity: community, activeView: "communities", panelError: "" });
    const communityPosts = await api.communityFeed(community.id);
    set({ communityPosts });
  },
  async joinCommunity(communityId) {
    const { token } = get();
    if (!token) throw new Error("login_required");
    await api.joinCommunity(token, communityId);
    const communities = await api.communities();
    set({ communities });
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
