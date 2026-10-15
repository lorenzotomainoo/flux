"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/Avatar";
import LikeButton from "@/components/ui/LikeButton";
import { setLike } from "@/lib/likes";
import { timeAgo } from "@/lib/utils";
import type { CommentWithAuthor } from "@/types";

export default function CommentList({ comments }: { comments: CommentWithAuthor[] }) {
  if (comments.length === 0) {
    return <p className="py-2 text-sm text-muted">Nessun commento. Scrivi il primo!</p>;
  }
  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-2.5">
          <UserAvatar user={c.author} size={28} />
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl bg-surface-2 px-3 py-2">
              <div className="flex items-baseline gap-2 text-xs">
                <Link href={`/${c.author.username}`} className="font-semibold hover:underline">
                  @{c.author.username}
                </Link>
                <span suppressHydrationWarning className="text-muted">{timeAgo(c.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
            </div>
            <div className="mt-0.5 flex justify-end">
              <LikeButton
                initialCount={c.like_count}
                initialLiked={c.liked}
                onChange={(liked) => setLike("comment", c.id, liked)}
                label="al commento"
                size={14}
                className="px-1.5 py-0.5 text-xs"
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
