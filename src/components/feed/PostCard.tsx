"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import ExpiryBadge from "./ExpiryBadge";
import MediaGrid from "./MediaGrid";
import CommentList from "./CommentList";
import CommentForm from "./CommentForm";
import { createClient } from "@/lib/supabase/client";
import { deletePost } from "@/lib/actions/deletePost";
import { AUTHOR_FIELDS } from "@/lib/fields";
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
        .select(`id, content, created_at, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS})`)
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      setComments((data ?? []) as unknown as CommentWithAuthor[]);
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
      <MediaGrid paths={post.media_paths} />

      <footer className="flex items-center justify-between">
        <button
          onClick={toggleComments}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <MessageCircle size={16} />
          {count > 0 ? count : "Commenta"}
        </button>
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
