import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type Props = {
  message: Message;
  mine: boolean;
  seen: boolean;
  /** nome del mittente, mostrato nei gruppi sopra i messaggi altrui */
  senderName?: string;
};

export default function MessageBubble({ message, mine, seen, senderName }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {senderName && <span className="mb-0.5 px-1 text-[11px] font-semibold text-accent">{senderName}</span>}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2",
          mine ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-surface-2"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          suppressHydrationWarning
          className={cn("mt-0.5 text-right text-[10px]", mine ? "opacity-70" : "text-muted")}
        >
          {time}
        </p>
      </div>
      {mine && seen && <span className="mt-0.5 px-1 text-[11px] text-muted">Visto</span>}
    </div>
  );
}
