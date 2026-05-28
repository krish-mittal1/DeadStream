"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { useSimulationStore } from "../store/useSimulationStore";
import { FeedSkeleton } from "./LoadingSkeleton";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { Lightbox } from "./Lightbox";
import { copyToClipboard } from "./feed/helpers";
import { SortTabs } from "./feed/SortTabs";
import { NewPostsToast } from "./feed/NewPostsToast";
import { EmptyFeed } from "./feed/EmptyFeed";
import { PostCard } from "./feed/PostCard";

export function Feed({ compact = false }) {
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

  useKeyboardShortcuts(posts);

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
    <div className="w-full max-w-[680px] mx-auto">
      <SortTabs activeSort={feedSort} onSortChange={setFeedSort} />
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
        </div>
      )}

      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
