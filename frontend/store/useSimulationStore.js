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
  trendingTopics: [],
  leaderboardData: [],
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
  feedSort: "hot",
  feedCursor: null,
  socket: null,
  // Notifications
  notifications: [],
  unreadCount: 0,
  // Bookmarks
  bookmarkedIds: new Set(),
  // Theme
  theme: "dark",
  // New posts indicator
  newPostCount: 0,

  async bootstrap() {
    set({ loading: true });
    try {
      const [posts, events, trends, agents, communities, graph, trendingTopics, leaderboardData] = await Promise.all([
        api.feed(get().feedSort),
        api.events(),
        api.trends(),
        api.agents(),
        api.communities(),
        api.influenceGraph(),
        api.trendingTopics().catch(() => []),
        api.leaderboard().catch(() => []),
      ]);
      set({ posts, events, trends, agents, communities, graph, trendingTopics, leaderboardData, loading: false });
    } catch (err) {
      set({ loading: false, panelError: "Failed to load simulation data" });
    }
    get().connectSocket();
    if (get().token) {
      get().fetchNotifications();
      get().checkBookmarks(get().posts.map((p) => p.id));
    }
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
      // Increment new post count instead of auto-refreshing
      set((state) => ({ newPostCount: state.newPostCount + 1 }));
    });
    socket.emit("subscribe", { room: "global-feed" });
    set({ socket });
  },

  // --- New posts toast ---
  loadNewPosts() {
    api.feed(get().feedSort).then((posts) => {
      set({ posts, newPostCount: 0 });
      api.trends().then((trends) => set({ trends })).catch(() => {});
      api.agents().then((agents) => set({ agents })).catch(() => {});
      if (get().token && posts.length) {
        get().checkBookmarks(posts.map((p) => p.id));
      }
    }).catch(() => {});
  },

  // --- Sort ---
  setFeedSort(sort) {
    set({ feedSort: sort, loading: true });
    api.feed(sort).then((posts) => {
      set({ posts, feedCursor: null, loading: false });
      if (get().token && posts.length) {
        get().checkBookmarks(posts.map((p) => p.id));
      }
    }).catch(() => set({ loading: false }));
  },

  // --- Auth ---
  async login(username, password) {
    const auth = await api.login({ username, password });
    const userData = { ...auth, id: auth.user_id };
    set({ token: auth.token, user: userData });
    if (typeof window !== "undefined") {
      localStorage.setItem("deadstream-token", auth.token);
      localStorage.setItem("deadstream-user", JSON.stringify(userData));
    }
    get().fetchNotifications();
  },
  async register(username, password, displayName) {
    const auth = await api.register({ username, password, display_name: displayName });
    const userData = { ...auth, id: auth.user_id };
    set({ token: auth.token, user: userData });
    if (typeof window !== "undefined") {
      localStorage.setItem("deadstream-token", auth.token);
      localStorage.setItem("deadstream-user", JSON.stringify(userData));
    }
    get().fetchNotifications();
  },
  logout() {
    set({ token: null, user: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem("deadstream-token");
      localStorage.removeItem("deadstream-user");
    }
  },
  initAuth() {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("deadstream-token");
        const raw = localStorage.getItem("deadstream-user");
        if (token && raw) {
          set({ token, user: JSON.parse(raw) });
        }
      } catch {
        localStorage.removeItem("deadstream-token");
        localStorage.removeItem("deadstream-user");
      }
    }
  },

  async post(body, image_url = null, title = null) {
    const { token, selectedPost } = get();
    if (!token) throw new Error("login_required");
    const payload = { body, parent_id: selectedPost?.id || null };
    if (image_url) payload.image_url = image_url;
    if (title) payload.title = title;
    const post = await api.post(token, payload);
    set((state) => ({ posts: [post, ...state.posts], selectedPost: null }));
  },

  selectPost(post) { set({ selectedPost: post }); },
  clearSelectedPost() { set({ selectedPost: null }); },
  setActiveView(activeView) { set({ activeView }); },

  async openThread(post) {
    set({ selectedPost: post, panelError: "" });
    const threadReplies = await api.postReplies(post.id);
    set({ threadReplies });
  },
  closeThread() { set({ selectedPost: null, threadReplies: [] }); },

  async openProfile(userId) {
    set({ panelError: "" });
    const selectedProfile = await api.userProfile(userId);
    set({ selectedProfile });
  },
  closeProfile() { set({ selectedProfile: null }); },

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
    api.feed(get().feedSort).then((posts) => {
      set({ posts });
      if (posts.length) get().checkBookmarks(posts.map((p) => p.id));
    }).catch(() => {});
  },

  async follow(userId) {
    const { token } = get();
    if (!token) throw new Error("login_required");
    await api.follow(token, userId);
  },

  // --- Notifications ---
  async fetchNotifications() {
    const { token } = get();
    if (!token) return;
    try {
      const [notifications, { count }] = await Promise.all([
        api.notifications(token),
        api.unreadCount(token),
      ]);
      set({ notifications, unreadCount: count });
    } catch {}
  },
  async markNotifRead(id) {
    const { token } = get();
    if (!token) return;
    try {
      await api.markNotificationRead(token, id);
      get().fetchNotifications();
    } catch {}
  },
  async markAllNotifsRead() {
    const { token } = get();
    if (!token) return;
    try {
      await api.markAllNotificationsRead(token);
      set({ unreadCount: 0 });
      get().fetchNotifications();
    } catch {}
  },

  // --- Bookmarks ---
  async toggleBookmark(postId) {
    const { token, bookmarkedIds } = get();
    if (!token) return;
    const newSet = new Set(bookmarkedIds);
    try {
      if (newSet.has(postId)) {
        await api.removeBookmark(token, postId);
        newSet.delete(postId);
      } else {
        await api.bookmarkPost(token, postId);
        newSet.add(postId);
      }
      set({ bookmarkedIds: newSet });
    } catch {}
  },
  async checkBookmarks(postIds) {
    const { token } = get();
    if (!token || !postIds.length) return;
    const newSet = new Set(get().bookmarkedIds);
    try {
      const results = await Promise.all(
        postIds.slice(0, 20).map((id) =>
          api.checkBookmark(token, id).then((r) => r.bookmarked ? id : null).catch(() => null)
        )
      );
      results.filter(Boolean).forEach((id) => newSet.add(id));
      set({ bookmarkedIds: newSet });
    } catch {}
  },

  // --- Theme ---
  toggleTheme() {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    if (typeof window !== "undefined") {
      localStorage.setItem("deadstream-theme", next);
    }
  },
  initTheme() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deadstream-theme") || "dark";
      set({ theme: saved });
    }
  },

  // --- Leaderboard ---
  async fetchLeaderboard(sort = "activity") {
    try {
      const data = await api.leaderboard(sort);
      set({ leaderboardData: data });
    } catch {}
  },
  async fetchTrendingTopics() {
    try {
      const data = await api.trendingTopics();
      set({ trendingTopics: data });
    } catch {}
  },
}));
