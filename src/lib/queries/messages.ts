import type { createClient } from "@/lib/supabase/server";
import { signChatFiles, messagePreview } from "@/lib/chatFiles";
import { AUTHOR_FIELDS, MESSAGE_FIELDS } from "@/lib/fields";
import type {
  AuthorLite,
  ChatInfo,
  ChatMember,
  ConversationKind,
  ConversationPreview,
  Message,
} from "@/types";

type Client = Awaited<ReturnType<typeof createClient>>;

type UnreadRow = { conversation_id: string; unread: number };

async function getUnreadRows(supabase: Client): Promise<UnreadRow[]> {
  const { data } = await supabase.rpc("unread_counts");
  return (data ?? []) as unknown as UnreadRow[];
}

/** Elenco chat (1-a-1 e gruppi) con ultimo messaggio e non letti, dalla più recente. */
export async function getConversations(supabase: Client, userId: string): Promise<ConversationPreview[]> {
  // le chat scadute e quelle che hai eliminato per te non compaiono (la RLS nasconde le scadute)
  const { data: mine } = await supabase
    .from("conversation_members")
    .select(
      "conversation_id, role, conversation:conversations!conversation_members_conversation_id_fkey(id, kind, name, expires_at, created_at)"
    )
    .eq("user_id", userId)
    .eq("hidden", false);

  type Row = {
    conversation_id: string;
    role: string;
    conversation: { id: string; kind: string; name: string | null; expires_at: string | null; created_at: string } | null;
  };
  const rows = ((mine ?? []) as unknown as Row[]).filter((r) => r.conversation !== null);
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.conversation_id);

  const [{ data: allMembers }, { data: recent }, unreadRows] = await Promise.all([
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    supabase
      .from("messages")
      .select("conversation_id, sender_id, content, created_at, media_paths, audio_path")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(300),
    getUnreadRows(supabase),
  ]);

  const membersByConv = new Map<string, string[]>();
  for (const m of allMembers ?? []) {
    membersByConv.set(m.conversation_id, [...(membersByConv.get(m.conversation_id) ?? []), m.user_id]);
  }

  // profili delle "altre persone" nelle chat 1-a-1
  const otherIds = new Set<string>();
  for (const r of rows) {
    if (r.conversation?.kind === "direct") {
      for (const uid of membersByConv.get(r.conversation_id) ?? []) if (uid !== userId) otherIds.add(uid);
    }
  }
  const { data: profiles } =
    otherIds.size > 0
      ? await supabase.from("profiles").select(AUTHOR_FIELDS).in("id", [...otherIds])
      : { data: [] };
  const profileById = new Map(((profiles ?? []) as unknown as AuthorLite[]).map((p) => [p.id, p]));

  const lastByConv = new Map<string, ConversationPreview["last_message"]>();
  for (const m of recent ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, {
        content: messagePreview(m),
        sender_id: m.sender_id,
        created_at: m.created_at,
      });
    }
  }
  const unreadByConv = new Map(unreadRows.map((u) => [u.conversation_id, Number(u.unread)]));

  const items: { preview: ConversationPreview; sortKey: string }[] = [];
  for (const r of rows) {
    const c = r.conversation;
    if (!c) continue;
    const memberIds = membersByConv.get(r.conversation_id) ?? [];
    const otherId = memberIds.find((uid) => uid !== userId);
    const other = c.kind === "direct" && otherId ? (profileById.get(otherId) ?? null) : null;
    if (c.kind === "direct" && !other) continue; // profilo non disponibile

    const last = lastByConv.get(r.conversation_id) ?? null;
    items.push({
      sortKey: last?.created_at ?? c.created_at,
      preview: {
        id: r.conversation_id,
        kind: c.kind as ConversationKind,
        name: c.name,
        expires_at: c.expires_at,
        other,
        member_count: memberIds.length,
        is_admin: r.role === "admin",
        last_message: last,
        unread: unreadByConv.get(r.conversation_id) ?? 0,
      },
    });
  }

  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).map((i) => i.preview);
}

/** Numero totale di messaggi non letti (badge sulla barra). */
export async function getUnreadCount(supabase: Client): Promise<number> {
  const rows = await getUnreadRows(supabase);
  return rows.reduce((n, r) => n + Number(r.unread), 0);
}

/** Persone che segui: servono per scegliere i partecipanti di un gruppo. */
export async function getFollowing(supabase: Client, userId: string): Promise<AuthorLite[]> {
  const { data } = await supabase
    .from("follows")
    .select(`user:profiles!follows_following_id_fkey(${AUTHOR_FIELDS})`)
    .eq("follower_id", userId)
    .limit(500);
  return ((data ?? []) as unknown as { user: AuthorLite | null }[])
    .map((r) => r.user)
    .filter((u): u is AuthorLite => u !== null)
    .sort((a, b) => a.username.localeCompare(b.username));
}

/** Una chat: info, partecipanti e ultimi 100 messaggi. null se non esiste, è scaduta o non sei dentro. */
export async function getChat(supabase: Client, conversationId: string, userId: string) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, kind, name, expires_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("user_id, role, last_read_at")
    .eq("conversation_id", conversationId);
  const rows = memberRows ?? [];
  if (!rows.some((r) => r.user_id === userId)) return null;

  const [{ data: profiles }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select(AUTHOR_FIELDS).in("id", rows.map((r) => r.user_id)),
    supabase
      .from("messages")
      .select(MESSAGE_FIELDS)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const byId = new Map(((profiles ?? []) as unknown as AuthorLite[]).map((p) => [p.id, p]));
  const members: ChatMember[] = rows.flatMap((r) => {
    const p = byId.get(r.user_id);
    return p ? [{ ...p, role: r.role as ChatMember["role"], last_read_at: r.last_read_at }] : [];
  });

  const info: ChatInfo = {
    id: conv.id,
    kind: conv.kind as ConversationKind,
    name: conv.name,
    expires_at: conv.expires_at,
  };

  const messages = ((msgs ?? []) as unknown as Message[]).reverse();
  // link temporanei per foto e audio (i file delle chat sono privati)
  const signedUrls = await signChatFiles(supabase, messages);

  return { info, members, messages, signedUrls };
}
