"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import MessageBubble from "./MessageBubble";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { createClient } from "@/lib/supabase/client";
import type { AuthorLite, Message } from "@/types";

type Props = {
  conversationId: string;
  currentUserId: string;
  other: AuthorLite;
  initialMessages: Message[];
};

const MAX_LENGTH = 2000;

export default function ChatWindow({ conversationId, currentUserId, other, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const markRead = useCallback(async () => {
    await createClient()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);
  }, [conversationId, currentUserId]);

  // apri la chat = leggi i messaggi
  useEffect(() => {
    void markRead();
  }, [markRead]);

  useRealtimeMessages(conversationId, {
    onInsert: (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.sender_id !== currentUserId) void markRead();
    },
    onUpdate: (m) => setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))),
  });

  // scorri in fondo (subito al primo caricamento, poi con animazione)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    const { data, error } = await createClient()
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content })
      .select("id, conversation_id, sender_id, content, created_at, read_at")
      .single();
    setSending(false);

    if (error || !data) {
      setError("Messaggio non inviato. Riprova.");
      return;
    }
    setText("");
    // l'evento realtime porterà lo stesso messaggio: il controllo sull'id evita i doppioni
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message]));
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const name = other.display_name || other.username;

  return (
    <div className="flex h-[calc(100dvh_-_5.85rem_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] flex-col overflow-hidden rounded-2xl border border-border bg-surface md:h-[calc(100dvh_-_3.75rem)]">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Link href="/messages" aria-label="Torna alle conversazioni" className="rounded-lg p-1.5 text-muted hover:text-fg">
          <ArrowLeft size={20} />
        </Link>
        <Link href={`/${other.username}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar src={other.avatar_url} name={name} size={36} />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{name}</p>
            <p className="truncate text-xs text-muted">@{other.username}</p>
          </div>
        </Link>
      </header>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">
            Nessun messaggio. Scrivi il primo: sparirà entro 24 ore.
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.sender_id === currentUserId}
              seen={m.id === lastMine?.id && m.read_at !== null}
            />
          ))
        )}
      </div>

      <form onSubmit={send} className="space-y-1 border-t border-border p-3">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_LENGTH}
            placeholder="Scrivi un messaggio…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-4 py-2.5 text-base outline-none transition focus:border-accent"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Invia"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
