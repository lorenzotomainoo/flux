import type { Message } from "@/types";

/** I file delle chat sono privati: si leggono con link temporanei, validi 12 ore. */
export const CHAT_URL_TTL = 60 * 60 * 12;

type Signed = { path: string | null; signedUrl: string | null };

/** Quello che ci serve da un client Supabase (browser o server). */
type StorageClientLike = {
  storage: {
    from: (bucket: string) => {
      createSignedUrls: (paths: string[], expiresIn: number) => PromiseLike<{ data: Signed[] | null }>;
    };
  };
};

/** Percorso → link temporaneo, per tutti gli allegati dei messaggi indicati. */
export async function signChatFiles(
  client: StorageClientLike,
  messages: Pick<Message, "media_paths" | "audio_path">[]
): Promise<Record<string, string>> {
  const media = [...new Set(messages.flatMap((m) => m.media_paths))];
  const audio = [...new Set(messages.flatMap((m) => (m.audio_path ? [m.audio_path] : [])))];
  const urls: Record<string, string> = {};

  const sign = async (bucket: string, paths: string[]) => {
    if (paths.length === 0) return;
    const { data } = await client.storage.from(bucket).createSignedUrls(paths, CHAT_URL_TTL);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    }
  };

  await Promise.all([sign("chat-media", media), sign("chat-audio", audio)]);
  return urls;
}

/** Testo da mostrare nell'elenco delle chat per un messaggio (anche se è solo un allegato). */
export function messagePreview(m: { content: string; media_paths?: string[]; audio_path?: string | null }): string {
  if (m.content.trim()) return m.content;
  if (m.audio_path) return "Messaggio vocale";
  const media = m.media_paths ?? [];
  if (media.length === 0) return "";
  if (media.every((p) => p.toLowerCase().endsWith(".gif"))) return "GIF";
  return media.length > 1 ? `${media.length} foto` : "Foto";
}
