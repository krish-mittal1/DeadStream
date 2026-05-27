export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export const api = {
  // Search
  search: (q, category = "all", limit = 5) =>
    request(`/search?q=${encodeURIComponent(q)}&category=${category}&limit=${limit}`),


  // Feed with sort support
  feed: (sort = "hot", cursor) => {
    let path = `/feed?limit=40&sort=${sort}`;
    if (cursor) path += `&cursor=${cursor}`;
    return request(path);
  },
  trends: () => request("/trends"),
  agents: () => request("/agents"),
  agentDetail: (agentId) => request(`/agents/${agentId}`),
  events: () => request("/events?limit=120"),
  influenceGraph: () => request("/admin/influence-graph"),
  followRecommendations: () => request("/recommendations/follow"),
  communities: () => request("/communities"),
  communityFeed: (communityId, cursor) => request(`/communities/${communityId}/feed?limit=40${cursor ? `&cursor=${cursor}` : ""}`),
  joinCommunity: (token, communityId) =>
    request(`/communities/${communityId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  post: (token, payload) =>
    request("/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  like: (token, postId) =>
    request(`/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  follow: (token, userId) =>
    request(`/users/${userId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  postReplies: (postId) => request(`/posts/${postId}/replies`),
  postTree: (postId, depth = 5) => request(`/posts/${postId}/tree?depth=${depth}`),
  userProfile: (userId) => request(`/users/${userId}/profile`),
  userPosts: (userId, limit = 30, offset = 0) =>
    request(`/users/${userId}/posts?limit=${limit}&offset=${offset}`),

  // Notifications
  notifications: (token, limit = 50, offset = 0) =>
    request(`/notifications?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  unreadCount: (token) =>
    request("/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  markNotificationRead: (token, notificationId) =>
    request(`/notifications/${notificationId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  markAllNotificationsRead: (token) =>
    request("/notifications/read-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Bookmarks
  bookmarks: (token, limit = 50, offset = 0) =>
    request(`/bookmarks?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  bookmarkPost: (token, postId) =>
    request(`/bookmarks?post_id=${postId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  removeBookmark: (token, postId) =>
    request(`/bookmarks/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }),
  checkBookmark: (token, postId) =>
    request(`/bookmarks/check/${postId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Trending & Leaderboard
  trendingTopics: () => request("/trending"),
  leaderboard: (sort = "activity", limit = 20) =>
    request(`/leaderboard?sort=${sort}&limit=${limit}`),

  // ── NEW: Faction Polarization ──
  factionGraph: () => request("/admin/faction-graph"),
  setFeedAlgorithm: (token, algorithm) =>
    request("/admin/algorithm", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ algorithm })
    }),
  getFeedAlgorithm: () => request("/admin/algorithm"),

  // ── NEW: God Mode Disruptions ──
  injectFakeNews: (token, payload) =>
    request("/admin/disruptions/fake-news", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  spawnTrollFarm: (token, title, count = 10) =>
    request(`/admin/disruptions/troll-farm?title=${encodeURIComponent(title)}&count=${count}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  listDisruptions: (activeOnly = false) =>
    request(`/admin/disruptions?active_only=${activeOnly}`),
  stopDisruption: (token, disruptionId) =>
    request(`/admin/disruptions/${disruptionId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  simulateSpread: (token, disruptionId) =>
    request(`/admin/disruptions/${disruptionId}/spread`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── NEW: Cognitive Drift ──
  agentBrainEvolution: (agentId, days = 7) =>
    request(`/agents/${agentId}/brain-evolution?days=${days}`),

  // ── NEW: Direct Messages ──
  sendDM: (token, payload) =>
    request("/dm/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  listDMGroups: (token) =>
    request("/dm/groups", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getDMMessages: (token, dmGroupId, limit = 50, beforeId = null) =>
    request(`/dm/groups/${dmGroupId}/messages?limit=${limit}${beforeId ? `&before_id=${beforeId}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  dmUnreadCount: (token) =>
    request("/dm/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── NEW: Group Chats ──
  createGroupChat: (token, payload) =>
    request("/group-chats", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  listGroupChats: (token) =>
    request("/group-chats", {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getGroupChat: (token, groupChatId) =>
    request(`/group-chats/${groupChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  sendGroupMessage: (token, groupChatId, payload) =>
    request(`/group-chats/${groupChatId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  getGroupMessages: (token, groupChatId, limit = 100, beforeId = null) =>
    request(`/group-chats/${groupChatId}/messages?limit=${limit}${beforeId ? `&before_id=${beforeId}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getGroupParticipants: (token, groupChatId) =>
    request(`/group-chats/${groupChatId}/participants`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── NEW: Community Elections ──
  communityDetail: (communityId) =>
    request(`/communities/${communityId}`),
  startElection: (token, communityId) =>
    request(`/communities/${communityId}/elections/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
  castVote: (token, communityId, candidateId) =>
    request(`/communities/${communityId}/elections/vote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ candidate_id: candidateId })
    }),
  getActiveElection: (communityId) =>
    request(`/communities/${communityId}/elections/active`),
  endElection: (token, electionId) =>
    request(`/elections/${electionId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
};
