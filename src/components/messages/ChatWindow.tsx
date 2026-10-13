"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ghost } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import GhostBackdrop from "./GhostBackdrop";
import GroupAvatar from "./GroupAvatar";
import ChatComposer from "./ChatComposer";
import MessageBubble from "./MessageBubble";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { signChatFiles } from "@/lib/chatFiles";
import { createClient } from "@/lib/supabase/client";
import { cn, timeLeft } from "@/lib/utils";
import type { ChatInfo, ChatMember, Message } from "@/types";

type Props = {
  chat: ChatInfo;
  currentUserId: string;
  members: ChatMember[];
  initialMessages: Message[];
  /** link temporanei dei file già presenti: percorso → indirizzo */
  signedUrls: Record<string, string>;
};


export default function ChatWindow({ chat, currentUserId, members, initialMessages, signedUrls }: Props) {
  const router = useRouter();
  const isGroup = chat.kind === "group";
  const temporary = chat.expires_at !== null;

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [urls, setUrls] = useState<Record<string, string>>(signedUrls);
  const [showMembers, setShowMembers] = useState(false);
  const [reads, setReads] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.last_read_at]))
  );
  const [expired, setExpired] = useState(false);
  const [left, setLeft] = useState(() => (chat.expires_at ? timeLeft(chat.expires_at) : null));

  const listRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const other = isGroup ? undefined : members.find((m) => m.id !== currentUserId);

  // Chat temporanea: conto alla rovescia e autodistruzione
  useEffect(() => {
    if (!chat.expires_at) return;
    const end = new Date(chat.expires_at).getTime();
    const tick = () => {
      if (Date.now() >= end) setExpired(true);
      else setLeft(timeLeft(chat.expires_at as string));
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [chat.expires_at]);

  const markRead = useCallback(async () => {
    await createClient().rpc("mark_read", { conv: chat.id });
  }, [chat.id]);

  // apri la chat = leggi i messaggi
  useEffect(() => {
    void markRead();
  }, [markRead]);

  useRealtimeMessages(chat.id, {
    onInsert: (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.sender_id !== currentUserId) void markRead();
    },
    onMemberRead: (r) => setReads((prev) => ({ ...prev, [r.user_id]: r.last_read_at })),
  });

  // scorri in fondo (subito al primo caricamento, poi con animazione)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [messages.length]);

  function onSent(message: Message) {
    // l'evento realtime porterà lo stesso messaggio: il controllo sull'id evita i doppioni
    setMessages((prev) => (prev.some((x) => x.id === message.id) ? prev : [...prev, message]));
  }

  // Link temporanei per gli allegati dei messaggi nuovi (arrivati in tempo reale o inviati da me).
  // Ogni percorso si prova una volta sola: se fallisce non si ripete all'infinito.
  const attempted = useRef(new Set<string>(Object.keys(signedUrls)));
  useEffect(() => {
    const todo = messages.filter(
      (m) =>
        m.media_paths.some((p) => !attempted.current.has(p)) ||
        (m.audio_path !== null && !attempted.current.has(m.audio_path))
    );
    if (todo.length === 0) return;
    todo.forEach((m) => {
      m.media_paths.forEach((p) => attempted.current.add(p));
      if (m.audio_path) attempted.current.add(m.audio_path);
    });
    void signChatFiles(createClient(), todo).then((fresh) => {
      if (Object.keys(fresh).length > 0) setUrls((prev) => ({ ...prev, ...fresh }));
    });
  }, [messages]);

  // "Visto" solo nelle chat 1-a-1
  const lastMine = [...messages].reverse().find((m) => m.sender_id === currentUserId);
  const otherRead = other ? reads[other.id] : undefined;
  const seenId =
    lastMine && otherRead && new Date(otherRead).getTime() >= new Date(lastMine.created_at).getTime()
      ? lastMine.id
      : null;

  const title = isGroup ? (chat.name ?? "Gruppo") : (other?.display_name || other?.username || "Chat");

  const headerInner = isGroup ? (
    <>
      <GroupAvatar temporary={temporary} size={36} />
      <div className="min-w-0 text-left">
        <p className="truncate font-semibold leading-tight">{title}</p>
        <p suppressHydrationWarning className="truncate text-xs text-muted">
          {members.length} partecipanti
          {left && (
            <span className={cn(left.urgent && "font-semibold text-orange-500")}> · scade tra {left.label}</span>
          )}
        </p>
      </div>
    </>
  ) : (
    other && (
      <>
        <UserAvatar user={other} size={36} />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs text-muted">@{other.username}</p>
        </div>
      </>
    )
  );

  return (
    <div className="flex h-[calc(100dvh_-_5.85rem_-_env(safe-area-inset-top,0px)_-_env(safe-area-inset-bottom,0px))] flex-col overflow-hidden rounded-2xl border border-border bg-surface md:h-[calc(100dvh_-_3.75rem)]">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Link href="/messages" aria-label="Torna alle conversazioni" className="rounded-lg p-1.5 text-muted hover:text-fg">
          <ArrowLeft size={20} />
        </Link>
        {isGroup ? (
          <button
            onClick={() => setShowMembers((v) => !v)}
            aria-expanded={showMembers}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg"
          >
            {headerInner}
          </button>
        ) : (
          other && (
            <Link href={`/${other.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              {headerInner}
            </Link>
          )
        )}
        {temporary && <Ghost size={18} className="shrink-0 text-accent" aria-label="Chat temporanea" />}
      </header>

      {isGroup && showMembers && (
        <ul className="grid grid-cols-1 gap-1 border-b border-border bg-surface-2/50 p-2 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/${m.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-2"
              >
                <UserAvatar user={m} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.display_name || m.username}
                  <span className="text-muted"> @{m.username}</span>
                </span>
                {m.role === "admin" && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">admin</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-h-0 flex-1">
        {temporary && <GhostBackdrop />}

        <div ref={listRef} className="absolute inset-0 space-y-2 overflow-y-auto px-3 py-4">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              {temporary
                ? "Chat temporanea. Scrivi qualcosa prima che svanisca."
                : "Nessun messaggio. Scrivi il primo: sparirà entro 24 ore."}
            </p>
          ) : (
            messages.map((m, i) => {
              const mine = m.sender_id === currentUserId;
              const showName = isGroup && !mine && messages[i - 1]?.sender_id !== m.sender_id;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  mine={mine}
                  seen={m.id === seenId}
                  urls={urls}
                  senderName={showName ? (byId.get(m.sender_id)?.display_name || byId.get(m.sender_id)?.username || "Utente") : undefined}
                />
              );
            })
          )}
        </div>

        {expired && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface/90 p-6 text-center backdrop-blur-sm">
            <div className="space-y-3">
              <Ghost size={44} className="mx-auto text-accent" />
              <p className="font-bold">Questa chat si è autodistrutta</p>
              <p className="text-sm text-muted">Il tempo è scaduto e i messaggi sono spariti.</p>
              <button
                onClick={() => {
                  router.replace("/messages");
                  router.refresh();
                }}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
              >
                Torna ai messaggi
              </button>
            </div>
          </div>
        )}
      </div>

      <ChatComposer
        conversationId={chat.id}
        currentUserId={currentUserId}
        disabled={expired}
        onSent={onSent}
      />
    </div>
  );
}
