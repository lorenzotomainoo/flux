import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { cn, timeAgo } from "@/lib/utils";
import type { ConversationPreview } from "@/types";

type Props = { conversations: ConversationPreview[]; currentUserId: string };

export default function ConversationList({ conversations, currentUserId }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        Nessuna conversazione. Apri il profilo di qualcuno e premi Scrivi.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((c) => {
        const name = c.other.display_name || c.other.username;
        const last = c.last_message;
        const preview = last
          ? `${last.sender_id === currentUserId ? "Tu: " : ""}${last.content}`
          : "Nessun messaggio";

        return (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:bg-surface-2"
          >
            <Avatar src={c.other.avatar_url} name={name} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">{name}</p>
                {last && <span className="shrink-0 text-xs text-muted">{timeAgo(last.created_at)}</span>}
              </div>
              <p className={cn("truncate text-sm", c.unread > 0 ? "font-semibold text-fg" : "text-muted")}>
                {preview}
              </p>
            </div>
            {c.unread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">
                {c.unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
