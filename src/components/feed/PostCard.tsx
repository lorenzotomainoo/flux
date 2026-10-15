"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import ExpiryBadge from "./ExpiryBadge";
import AudioPlayer from "./AudioPlayer";
import MediaGrid from "./MediaGrid";
import CommentList from "./CommentList";
import CommentForm from "./CommentForm";
import LikeButton from "@/components/ui/LikeButton";
import { createClient } from "@/lib/supabase/client";
import { deletePost } from "@/lib/actions/deletePost";
import { AUTHOR_FIELDS } from "@/lib/fields";
import { fetchLikedCommentIds, setLike } from "@/lib/likes";
import { publicUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/utils";
import type { CommentWithAuthor, PostWithAuthor } from "@/types";

type Props = { post: PostWithAuthor; currentUserId: string };

export default function PostCard({ post, currentUserId }: Props) {
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[] | null>(null);
  const [count, setCount] = useState(post.comments?.[0]?.count ?? 0);

  if (deleted) return null;

  const { author } = post;
  const isMine = author.id === currentUserId;

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      const { data } = await createClient()
        .from("comments")
        .select(`id, content, created_at, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS}), comment_likes(count)`)
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      type Row = Omit<CommentWithAuthor, "like_count" | "liked"> & { comment_likes: { count: number }[] };
      const rows = (data ?? []) as unknown as Row[];
      const liked = await fetchLikedCommentIds(currentUserId, rows.map((r) => r.id));
      setComments(
        rows.map(({ comment_likes, ...c }) => ({
          ...c,
          like_count: comment_likes?.[0]?.count ?? 0,
          liked: liked.has(c.id),
        }))
      );
    }
  }

  async function onDelete() {
    if (!window.confirm("Eliminare questo post?")) return;
    const res = await deletePost(post.id);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setDeleted(true);
    router.refresh();
  }

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <header className="flex items-start gap-3">
        <Link href={`/${author.username}`}>
          <UserAvatar user={author} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/${author.username}`} className="block truncate font-semibold hover:underline">
            {author.display_name || author.username}
          </Link>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span>@{author.username}</span>
            <span>·</span>
            <span suppressHydrationWarning>{timeAgo(post.created_at)}</span>
          </p>
        </div>
        {isMine && (
          <button
            onClick={onDelete}
            aria-label="Elimina post"
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        )}
      </header>

      {post.content && <p className="whitespace-pre-wrap break-words">{post.content}</p>}
      {post.audio_path && post.audio_duration && (
        <AudioPlayer
          src={publicUrl("post-audio", post.audio_path)}
          duration={post.audio_duration}
          peaks={post.audio_peaks}
          like={{
            count: post.audio_like_count,
            liked: post.audio_liked,
            onChange: (liked) => setLike("audio", post.id, liked),
          }}
        />
      )}
      <MediaGrid paths={post.media_paths} />

      <footer className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <LikeButton
            initialCount={post.like_count}
            initialLiked={post.liked}
            onChange={(liked) => setLike("post", post.id, liked)}
            label="al post"
          />
          <button
            onClick={toggleComments}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <MessageCircle size={16} />
            {count > 0 ? count : "Commenta"}
          </button>
        </div>
        <ExpiryBadge expiresAt={post.expires_at} />
      </footer>

      {open && (
        <div className="space-y-3 border-t border-border pt-3">
          {comments === null ? (
            <p className="text-sm text-muted">Carico i commenti…</p>
          ) : (
            <CommentList comments={comments} />
          )}
          <CommentForm
            postId={post.id}
            onAdded={(c) => {
              setComments((prev) => [...(prev ?? []), c]);
              setCount((n) => n + 1);
            }}
          />
        </div>
      )}
    </article>
  );
}
