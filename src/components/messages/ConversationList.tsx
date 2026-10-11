"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Ghost } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import ChatActionSheet, { type SheetAction } from "./ChatActionSheet";
import GroupAvatar from "./GroupAvatar";
import { createClient } from "@/lib/supabase/client";
import { cn, timeAgo, timeLeft } from "@/lib/utils";
import type { ConversationPreview } from "@/types";

type Props = { conversations: ConversationPreview[]; currentUserId: string };

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10;

export default function ConversationList({ conversations, currentUserId }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<ConversationPreview | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);

  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function open(c: ConversationPreview) {
    longPressed.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(15);
    setTarget(c);
  }

  function onPointerDown(e: React.PointerEvent, c: ConversationPreview) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressed.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };
    cancelPress();
    timer.current = setTimeout(() => open(c), LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = startPoint.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE) cancelPress();
  }

  function onClickCapture(e: React.MouseEvent) {
    // il click che segue una pressione prolungata non deve aprire la chat
    if (longPressed.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressed.current = false;
    }
  }

  function actionsFor(c: ConversationPreview): SheetAction[] {
    const supabase = createClient();
    const done = () => router.refresh();

    if (c.kind === "direct") {
      return [
        {
          key: "delete",
          label: "Elimina chat",
          description: "La chat sparisce solo per te. Se l'altra persona ti scrive, riappare vuota.",
          confirmLabel: "Elimina",
          run: async () => {
            const { error } = await supabase.rpc("leave_conversation", { conv: c.id });
            if (error) return "Non sono riuscito a eliminare la chat.";
            done();
            return null;
          },
        },
      ];
    }

    const list: SheetAction[] = [
      {
        key: "leave",
        label: "Esci dal gruppo",
        description: "Non vedrai più i messaggi del gruppo. Gli altri restano dentro.",
        confirmLabel: "Esci",
        run: async () => {
          const { error } = await supabase.rpc("leave_conversation", { conv: c.id });
          if (error) return "Non sono riuscito a uscire dal gruppo.";
          done();
          return null;
        },
      },
    ];
    if (c.is_admin) {
      list.push({
        key: "delete-all",
        label: "Elimina gruppo per tutti",
        description: "Il gruppo e tutti i suoi messaggi spariscono per ogni partecipante. Non si può annullare.",
        confirmLabel: "Elimina per tutti",
        run: async () => {
          const { error } = await supabase.rpc("delete_group_for_all", { conv: c.id });
          if (error) return "Non sono riuscito a eliminare il gruppo.";
          done();
          return null;
        },
      });
    }
    return list;
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        Nessuna conversazione. Apri il profilo di qualcuno e premi Scrivi, oppure crea un gruppo.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {conversations.map((c) => {
          const isGroup = c.kind === "group";
          const title = isGroup ? (c.name ?? "Gruppo") : (c.other?.display_name || c.other?.username || "Chat");
          const last = c.last_message;
          const preview = last
            ? `${last.sender_id === currentUserId ? "Tu: " : ""}${last.content}`
            : isGroup
              ? `${c.member_count} partecipanti`
              : "Nessun messaggio";
          const left = c.expires_at ? timeLeft(c.expires_at) : null;

          return (
            <div
              key={c.id}
              onPointerDown={(e) => onPointerDown(e, c)}
              onPointerMove={onPointerMove}
              onPointerUp={cancelPress}
              onPointerCancel={cancelPress}
              onPointerLeave={cancelPress}
              onClickCapture={onClickCapture}
              onContextMenu={(e) => {
                // tasto destro (desktop) o pressione prolungata (Android): stesso menu
                e.preventDefault();
                cancelPress();
                if (!target) open(c);
              }}
              className="select-none [-webkit-touch-callout:none]"
            >
              <Link
                href={`/messages/${c.id}`}
                draggable={false}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:bg-surface-2 active:bg-surface-2"
              >
                {isGroup ? (
                  <GroupAvatar temporary={c.expires_at !== null} size={48} />
                ) : (
                  c.other && <UserAvatar user={c.other} size={48} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <span className="truncate">{title}</span>
                      {c.expires_at && <Ghost size={14} className="shrink-0 text-accent" />}
                    </p>
                    {last && (
                      <span suppressHydrationWarning className="shrink-0 text-xs text-muted">
                        {timeAgo(last.created_at)}
                      </span>
                    )}
                  </div>
                  <p className={cn("truncate text-sm", c.unread > 0 ? "font-semibold text-fg" : "text-muted")}>
                    {preview}
                  </p>
                  {left && (
                    <p suppressHydrationWarning className={cn("text-[11px]", left.urgent ? "text-orange-500" : "text-muted")}>
                      scade tra {left.label}
                    </p>
                  )}
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">
                    {c.unread}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {target && (
          <ChatActionSheet
            key={target.id}
            title={target.kind === "group" ? (target.name ?? "Gruppo") : (target.other?.display_name || target.other?.username || "Chat")}
            actions={actionsFor(target)}
            onClose={() => setTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
