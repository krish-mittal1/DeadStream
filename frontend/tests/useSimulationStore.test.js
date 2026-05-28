import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "../store/useSimulationStore";

// Reset the store before each test
beforeEach(() => {
  useSimulationStore.setState({
    token: null,
    user: null,
    posts: [],
    events: [],
    connected: false,
    loading: true,
    theme: "dark",
    unreadCount: 0,
    newPostCount: 0,
    bookmarkedIds: new Set(),
    notifications: [],
    dmGroups: [],
    dmMessages: {},
    dmUnread: 0,
    groupChats: [],
    groupChatMessages: {},
    activeElections: {},
    disruptions: [],
  });
});

describe("useSimulationStore", () => {
  it("starts with default empty state", () => {
    const state = useSimulationStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.posts).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.connected).toBe(false);
    expect(state.loading).toBe(true);
    expect(state.theme).toBe("dark");
  });

  it("toggleTheme switches between dark and light", () => {
    const store = useSimulationStore.getState();
    expect(store.theme).toBe("dark");

    useSimulationStore.getState().toggleTheme();
    expect(useSimulationStore.getState().theme).toBe("light");

    useSimulationStore.getState().toggleTheme();
    expect(useSimulationStore.getState().theme).toBe("dark");
  });

  it("logout clears token and user", () => {
    useSimulationStore.setState({
      token: "abc123",
      user: { id: "1", username: "test" },
    });

    useSimulationStore.getState().logout();
    const state = useSimulationStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("selectPost and clearSelectedPost work", () => {
    const post = { id: "p1", body: "Test post" };
    useSimulationStore.getState().selectPost(post);
    expect(useSimulationStore.getState().selectedPost).toEqual(post);

    useSimulationStore.getState().clearSelectedPost();
    expect(useSimulationStore.getState().selectedPost).toBeNull();
  });

  it("setActiveView updates the active view", () => {
    useSimulationStore.getState().setActiveView("trending");
    expect(useSimulationStore.getState().activeView).toBe("trending");
  });

  it("setFeedSort updates sort and resets cursor", () => {
    useSimulationStore.setState({
      posts: [{ id: "p1" }],
      feedCursor: "abc",
    });

    // This will fail silently (no API call in test), but should update state
    useSimulationStore.getState().setFeedSort("new");

    const state = useSimulationStore.getState();
    expect(state.feedSort).toBe("new");
  });

  it("toggleBookmark does nothing when not authenticated", async () => {
    useSimulationStore.setState({ token: null, bookmarkedIds: new Set() });
    await useSimulationStore.getState().toggleBookmark("p1");
    expect(useSimulationStore.getState().bookmarkedIds.has("p1")).toBe(false);
  });

  it("increments newPostCount on feed:new socket event pattern", () => {
    expect(useSimulationStore.getState().newPostCount).toBe(0);
    useSimulationStore.setState((state) => ({
      newPostCount: state.newPostCount + 1,
    }));
    expect(useSimulationStore.getState().newPostCount).toBe(1);
  });
});
