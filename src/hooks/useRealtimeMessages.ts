import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";

type Handlers = {
  onInsert: (message: Message) => void;
  /** un partecipante ha letto la chat (serve per il "Visto" nelle chat 1-a-1) */
  onMemberRead: (read: { user_id: string; last_read_at: string }) => void;
};

/** Si iscrive agli eventi realtime di una conversazione: nuovi messaggi e letture. */
export function useRealtimeMessages(conversationId: string, handlers: Handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers; // sempre l'ultima versione, senza ri-sottoscrivere
  });

  useEffect(() => {
    const supabase = createClient();
    const filter = `conversation_id=eq.${conversationId}`;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) =>
        ref.current.onInsert(payload.new as Message)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter },
        (payload) =>
          ref.current.onMemberRead({
            user_id: payload.new.user_id as string,
            last_read_at: payload.new.last_read_at as string,
          })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
}
