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
  // Feed algorithm
  currentAlgorithm: "hot",
  // Faction graph
  factionGraph: { nodes: [], edges: [], polarization_index: 0, alpha_size: 0, beta_size: 0 },
  // Disruptions
  disruptions: [],
  // DMs
  dmGroups: [],
  dmMessages: {},
  dmUnread: 0,
  activeDMGroup: null,
  // Group chats
  groupChats: [],
  groupChatMessages: {},
  activeGroupChat: null,
  // Elections
  activeElections: {},

  async bootstrap() {
    set({ loading: true });

    // 1. Fetch CRITICAL path first — feed + events — unblock UI instantly
    try {
      const [posts, events] = await Promise.all([
        api.feed(get().feedSort),
        api.events(),
      ]);
      set({ posts, events, loading: false });
    } catch (err) {
      set({ loading: false, panelError: "Failed to load simulation feed" });
    }

    // 2. Fetch metadata progressively in the background (does not block UI rendering)
    api.trends().then((trends) => set({ trends })).catch(() => {});
    api.agents().then((agents) => set({ agents })).catch(() => {});
    api.communities().then((communities) => set({ communities })).catch(() => {});
    api.influenceGraph().then((graph) => set({ graph })).catch(() => {});
    api.trendingTopics().then((trendingTopics) => set({ trendingTopics })).catch(() => {});
    api.leaderboard().then((leaderboardData) => set({ leaderboardData })).catch(() => {});

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
      const notifTypes = ["agent_beef", "agent_replied", "user_replied", "user_liked", "agent_liked"];
      if (notifTypes.includes(event.type) && get().token) {
        const now = Date.now();
        if (!get()._lastNotifFetch || now - get()._lastNotifFetch > 10_000) {
          set({ _lastNotifFetch: now });
          get().fetchNotifications();
        }
      }
    });
    socket.on("feed:new", () => {
      set((state) => ({ newPostCount: state.newPostCount + 1 }));
    });
    socket.emit("subscribe", { room: "global-feed" });
    set({ socket });
  },

  loadNewPosts() {
    api.feed(get().feedSort).then((posts) => {
      set({ posts, newPostCount: 0, feedCursor: posts.length > 0 ? posts[posts.length - 1].created_at : null });
      api.trends().then((trends) => set({ trends })).catch(() => {});
      api.agents().then((agents) => set({ agents })).catch(() => {});
      if (get().token && posts.length) {
        get().checkBookmarks(posts.map((p) => p.id));
      }
    }).catch(() => {});
  },

  loadMore() {
    const { feedSort, feedCursor, posts } = get();
    if (!feedCursor) return;
    set({ loading: true });
    api.feed(feedSort, feedCursor).then((morePosts) => {
      const combined = [...posts, ...morePosts];
      const nextCursor = morePosts.length > 0 ? morePosts[morePosts.length - 1].created_at : null;
      set({ posts: combined, feedCursor: nextCursor, loading: false });
      if (get().token && morePosts.length) {
        get().checkBookmarks(morePosts.map((p) => p.id));
      }
    }).catch(() => set({ loading: false }));
  },

  setFeedSort(sort) {
    set({ feedSort: sort, loading: true });
    api.feed(sort).then((posts) => {
      set({ posts, feedCursor: null, loading: false });
      if (get().token && posts.length) {
        get().checkBookmarks(posts.map((p) => p.id));
      }
    }).catch(() => set({ loading: false }));
  },

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
    const bodyText = body || title;
    const titleText = selectedPost ? null : title;
    const payload = { body: bodyText, parent_id: selectedPost?.id || null };
    if (image_url) payload.image_url = image_url;
    if (titleText) payload.title = titleText;
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
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      ),
      communityPosts: state.communityPosts.map((p) =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      ),
      threadReplies: state.threadReplies.map((p) =>
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      ),
    }));
    try {
      const res = await api.like(token, postId);
      if (res?.like_count !== undefined) {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, like_count: res.like_count } : p
          ),
          communityPosts: state.communityPosts.map((p) =>
            p.id === postId ? { ...p, like_count: res.like_count } : p
          ),
          threadReplies: state.threadReplies.map((p) =>
            p.id === postId ? { ...p, like_count: res.like_count } : p
          ),
        }));
      }
    } catch {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count || 1) - 1) } : p
        ),
      }));
    }
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

  // ── Feed Algorithm ──
  async setAlgorithm(algorithm) {
    const { token } = get();
    if (!token) return;
    try {
      await api.setFeedAlgorithm(token, algorithm);
      set({ currentAlgorithm: algorithm });
    } catch {}
  },
  async fetchAlgorithm() {
    try {
      const { algorithm } = await api.getFeedAlgorithm();
      set({ currentAlgorithm: algorithm });
    } catch {}
  },

  // ── Faction Graph ──
  async fetchFactionGraph() {
    try {
      const data = await api.factionGraph();
      set({ factionGraph: data });
    } catch {}
  },

  // ── Disruptions ──
  async injectFakeNews(title, body = "", source = null) {
    const { token } = get();
    if (!token) return;
    try {
      await api.injectFakeNews(token, { title, body, source });
      get().fetchDisruptions();
    } catch {}
  },
  async spawnTrollFarm(title, count = 10) {
    const { token } = get();
    if (!token) return;
    try {
      await api.spawnTrollFarm(token, title, count);
      get().fetchDisruptions();
    } catch {}
  },
  async fetchDisruptions() {
    try {
      const data = await api.listDisruptions();
      set({ disruptions: data });
    } catch {}
  },
  async stopDisruption(disruptionId) {
    const { token } = get();
    if (!token) return;
    try {
      await api.stopDisruption(token, disruptionId);
      get().fetchDisruptions();
    } catch {}
  },
  async simulateSpread(disruptionId) {
    const { token } = get();
    if (!token) return;
    try {
      const res = await api.simulateSpread(token, disruptionId);
      return res.infection_rate;
    } catch {}
  },

  // ── Direct Messages ──
  async fetchDMGroups() {
    const { token } = get();
    if (!token) return;
    try {
      const groups = await api.listDMGroups(token);
      set({ dmGroups: groups });
    } catch {}
  },
  async fetchDMMessages(dmGroupId) {
    const { token } = get();
    if (!token) return;
    try {
      const messages = await api.getDMMessages(token, dmGroupId);
      set((state) => ({ dmMessages: { ...state.dmMessages, [dmGroupId]: messages } }));
    } catch {}
  },
  async sendDM(recipientId, body) {
    const { token } = get();
    if (!token) return;
    try {
      const msg = await api.sendDM(token, { recipient_id: recipientId, body });
      get().fetchDMGroups();
      return msg;
    } catch {}
  },
  async fetchDMUnread() {
    const { token } = get();
    if (!token) return;
    try {
      const { count } = await api.dmUnreadCount(token);
      set({ dmUnread: count });
    } catch {}
  },
  setActiveDMGroup(group) {
    set({ activeDMGroup: group });
    if (group) get().fetchDMMessages(group.id);
  },

  // ── Group Chats ──
  async fetchGroupChats() {
    const { token } = get();
    if (!token) return;
    try {
      const chats = await api.listGroupChats(token);
      set({ groupChats: chats });
    } catch {}
  },
  async createGroupChat(name, topic, participantIds) {
    const { token } = get();
    if (!token) return;
    try {
      await api.createGroupChat(token, { name, topic, participant_ids: participantIds });
      get().fetchGroupChats();
    } catch {}
  },
  async fetchGroupMessages(groupChatId) {
    const { token } = get();
    if (!token) return;
    try {
      const messages = await api.getGroupMessages(token, groupChatId);
      set((state) => ({ groupChatMessages: { ...state.groupChatMessages, [groupChatId]: messages } }));
    } catch {}
  },
  async sendGroupMessage(groupChatId, body) {
    const { token } = get();
    if (!token) return;
    try {
      const msg = await api.sendGroupMessage(token, groupChatId, { body });
      get().fetchGroupMessages(groupChatId);
      return msg;
    } catch {}
  },
  setActiveGroupChat(chat) {
    set({ activeGroupChat: chat });
    if (chat) get().fetchGroupMessages(chat.id);
  },

  // ── Community Elections ──
  async fetchActiveElection(communityId) {
    try {
      const election = await api.getActiveElection(communityId);
      set((state) => ({ activeElections: { ...state.activeElections, [communityId]: election } }));
      return election;
    } catch {}
  },
  async startElection(communityId) {
    const { token } = get();
    if (!token) return;
    try {
      await api.startElection(token, communityId);
      get().fetchActiveElection(communityId);
    } catch {}
  },
  async castVote(communityId, candidateId) {
    const { token } = get();
    if (!token) return;
    try {
      await api.castVote(token, communityId, candidateId);
      get().fetchActiveElection(communityId);
    } catch {}
  },

  // ── Refresh All ──
  async refreshAll() {
    try {
      await Promise.all([
        api.feed(get().feedSort).then((posts) => set({ posts })),
        api.events().then((events) => set({ events })),
        api.trends().then((trends) => set({ trends })),
        api.agents().then((agents) => set({ agents })),
        api.communities().then((communities) => set({ communities })),
      ]);
    } catch {}
  },
}));
