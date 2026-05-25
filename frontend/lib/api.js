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
  feed: (offset = 0) => request(`/feed?limit=40&offset=${offset}`),
  trends: () => request("/trends"),
  agents: () => request("/agents"),
  events: () => request("/events?limit=120"),
  influenceGraph: () => request("/admin/influence-graph"),
  followRecommendations: () => request("/recommendations/follow"),
  communities: () => request("/communities"),
  communityFeed: (communityId, offset = 0) => request(`/communities/${communityId}/feed?limit=40&offset=${offset}`),
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
  userProfile: (userId) => request(`/users/${userId}/profile`)
};
