"use client";

import { useMemo, useState } from "react";
import PostCard from "./PostCard";
import Button from "@/components/ui/Button";
import { loadFeed } from "@/lib/actions/loadFeed";
import type { FeedScope, PostWithAuthor } from "@/types";

type Props = {
  scope: FeedScope;
  initialPosts: PostWithAuthor[];
  hasMoreInitial: boolean;
  currentUserId: string;
};

export default function FeedList({ scope, initialPosts, hasMoreInitial, currentUserId }: Props) {
  const [extra, setExtra] = useState<PostWithAuthor[]>([]);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [loading, setLoading] = useState(false);

  // initialPosts si aggiorna con router.refresh(); extra contiene le pagine caricate dopo
  const posts = useMemo(() => {
    const ids = new Set(initialPosts.map((p) => p.id));
    return [...initialPosts, ...extra.filter((p) => !ids.has(p.id))];
  }, [initialPosts, extra]);

  async function loadMore() {
    const last = posts[posts.length - 1];
    if (!last) return;
    setLoading(true);
    const res = await loadFeed(scope, last.created_at);
    setExtra((prev) => [...prev, ...res.posts]);
    setHasMore(res.hasMore);
    setLoading(false);
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        {scope === "seguiti"
          ? "Ancora nessun post da chi segui. Passa a Mondiale per scoprire nuove persone, oppure scrivi il primo!"
          : "Nessun post nelle ultime 24 ore. Scrivi il primo!"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? "Carico…" : "Carica altri"}
          </Button>
        </div>
      )}
    </div>
  );
}
