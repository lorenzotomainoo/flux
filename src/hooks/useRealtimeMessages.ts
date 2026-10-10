import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";

type Handlers = {
  onInsert: (message: Message) => void;
  onUpdate: (message: Message) => void;
};

/** Si iscrive agli eventi realtime dei messaggi di una conversazione. */
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (payload) =>
        ref.current.onUpdate(payload.new as Message)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
}
