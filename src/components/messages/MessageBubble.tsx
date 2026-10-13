import AudioPlayer from "@/components/feed/AudioPlayer";
import ChatMedia from "./ChatMedia";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type Props = {
  message: Message;
  mine: boolean;
  seen: boolean;
  /** nome del mittente, mostrato nei gruppi sopra i messaggi altrui */
  senderName?: string;
  /** link temporanei dei file: percorso → indirizzo */
  urls: Record<string, string>;
};

export default function MessageBubble({ message, mine, seen, senderName, urls }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hasText = message.content.length > 0;
  const audioUrl = message.audio_path ? urls[message.audio_path] : undefined;

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      {senderName && <span className="mb-0.5 px-1 text-[11px] font-semibold text-accent">{senderName}</span>}

      {message.media_paths.length > 0 && (
        <ChatMedia items={message.media_paths.map((path) => ({ path, url: urls[path] }))} />
      )}

      {message.audio_path && message.audio_duration && (
        <div className="w-64 max-w-[80%] sm:w-72">
          {audioUrl ? (
            <AudioPlayer
              key={audioUrl}
              src={audioUrl}
              duration={message.audio_duration}
              peaks={message.audio_peaks}
            />
          ) : (
            <div className="animate-pulse rounded-2xl border border-border bg-surface-2 px-3 py-3 text-sm text-muted">
              Carico l&apos;audio…
            </div>
          )}
        </div>
      )}

      {hasText ? (
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
      ) : (
        <span suppressHydrationWarning className="px-1 text-[10px] text-muted">
          {time}
        </span>
      )}

      {mine && seen && <span className="px-1 text-[11px] text-muted">Visto</span>}
    </div>
  );
}
