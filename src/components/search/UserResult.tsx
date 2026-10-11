import Link from "next/link";
import { UserAvatar } from "@/components/ui/Avatar";
import type { AuthorLite } from "@/types";

export default function UserResult({ user }: { user: AuthorLite }) {
  return (
    <Link
      href={`/${user.username}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:bg-surface-2"
    >
      <UserAvatar user={user} size={44} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.display_name || user.username}</p>
        <p className="truncate text-sm text-muted">@{user.username}</p>
      </div>
    </Link>
  );
}
