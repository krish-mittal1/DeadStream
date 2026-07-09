"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import { FeedSkeleton } from "./LoadingSkeleton";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { Lightbox } from "./Lightbox";
import { copyToClipboard } from "./feed/helpers";
import { SortTabs } from "./feed/SortTabs";
import { NewPostsToast } from "./feed/NewPostsToast";
import { EmptyFeed } from "./feed/EmptyFeed";
import { PostCard } from "./feed/PostCard";

export function Feed({ compact = false, hideSort = false }) {
  const posts = useSimulationStore((s) => s.posts);
  const loading = useSimulationStore((s) => s.loading);
  const user = useSimulationStore((s) => s.user);
  const like = useSimulationStore((s) => s.like);
  const feedSort = useSimulationStore((s) => s.feedSort);
  const setFeedSort = useSimulationStore((s) => s.setFeedSort);
  const toggleBookmark = useSimulationStore((s) => s.toggleBookmark);
  const bookmarkedIds = useSimulationStore((s) => s.bookmarkedIds);
  const newPostCount = useSimulationStore((s) => s.newPostCount);
  const loadNewPosts = useSimulationStore((s) => s.loadNewPosts);
  const loadMore = useSimulationStore((s) => s.loadMore);
  const feedCursor = useSimulationStore((s) => s.feedCursor);

  useKeyboardShortcuts(posts);

  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && feedCursor && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [feedCursor, loading, loadMore]);

  const [copiedId, setCopiedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    copyToClipboard(url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleLike = useCallback((postId) => {
    like(postId).catch(() => {});
  }, [like]);

  const handleBookmark = useCallback((postId) => {
    toggleBookmark(postId).catch(() => {});
  }, [toggleBookmark]);

  if (loading && !posts.length) return <FeedSkeleton />;

  return (
    <div className="w-full max-w-[950px] mx-auto">
      {!hideSort && (
        <SortTabs activeSort={feedSort} onSortChange={setFeedSort} />
      )}
      <NewPostsToast count={newPostCount} onLoad={loadNewPosts} />

      {!posts.length ? (
        <EmptyFeed />
      ) : (
        <div className="mt-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                index={index}
                user={user}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onShare={handleShare}
                copiedId={copiedId}
                bookmarkedIds={bookmarkedIds}
                onImageExpand={setLightboxImage}
              />
            ))}
          </AnimatePresence>
          <div ref={sentinelRef} className="h-10" />
          {loading && posts.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          )}
        </div>
      )}

      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
