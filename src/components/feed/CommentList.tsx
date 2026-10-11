import Link from "next/link";
import { UserAvatar } from "@/components/ui/Avatar";
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
          <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
            <div className="flex items-baseline gap-2 text-xs">
              <Link href={`/${c.author.username}`} className="font-semibold hover:underline">
                @{c.author.username}
              </Link>
              <span className="text-muted">{timeAgo(c.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
