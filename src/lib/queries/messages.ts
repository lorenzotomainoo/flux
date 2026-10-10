import type { createClient } from "@/lib/supabase/server";
import type { AuthorLite, ConversationPreview, Message } from "@/types";

type Client = Awaited<ReturnType<typeof createClient>>;

const USER_FIELDS = "id, username, display_name, avatar_url";

/** Lista conversazioni con ultimo messaggio e non letti, dalla più recente. */
export async function getConversations(supabase: Client, userId: string): Promise<ConversationPreview[]> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, created_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (!convs || convs.length === 0) return [];

  const ids = convs.map((c) => c.id);
  const otherIds = convs.map((c) => (c.user_a === userId ? c.user_b : c.user_a));

  const [{ data: profiles }, { data: recent }, { data: unreadRows }] = await Promise.all([
    supabase.from("profiles").select(USER_FIELDS).in("id", otherIds),
    supabase
      .from("messages")
      .select("conversation_id, sender_id, content, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .is("read_at", null)
      .limit(1000),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as AuthorLite]));

  const lastByConv = new Map<string, ConversationPreview["last_message"]>();
  for (const m of recent ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, {
        content: m.content,
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    }
  }

  const unreadByConv = new Map<string, number>();
  for (const r of unreadRows ?? []) {
    unreadByConv.set(r.conversation_id, (unreadByConv.get(r.conversation_id) ?? 0) + 1);
  }

  return convs
    .map((c) => {
      const other = profileById.get(c.user_a === userId ? c.user_b : c.user_a);
      if (!other) return null;
      return {
        id: c.id,
        other,
        last_message: lastByConv.get(c.id) ?? null,
        unread: unreadByConv.get(c.id) ?? 0,
        sortKey: lastByConv.get(c.id)?.created_at ?? c.created_at,
      };
    })
    .filter((c): c is ConversationPreview & { sortKey: string } => c !== null)
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ sortKey, ...rest }) => {
      void sortKey;
      return rest;
    });
}

/** Numero totale di messaggi ricevuti non ancora letti (per il badge). */
export async function getUnreadCount(supabase: Client, userId: string): Promise<number> {
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/** Una chat: l'altro utente + gli ultimi 100 messaggi. null se non esiste o non sei un partecipante. */
export async function getChat(supabase: Client, conversationId: string, userId: string) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || (conv.user_a !== userId && conv.user_b !== userId)) return null;

  const otherId = conv.user_a === userId ? conv.user_b : conv.user_a;

  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select(USER_FIELDS).eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!other) return null;

  return {
    other: other as AuthorLite,
    messages: ((msgs ?? []) as Message[]).reverse(),
  };
}
