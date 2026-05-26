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
  userProfile: (userId) => request(`/users/${userId}/profile`),

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
};
