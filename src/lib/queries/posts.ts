import type { createClient } from "@/lib/supabase/server";
import { AUTHOR_FIELDS } from "@/lib/fields";
import type { FeedScope, PostWithAuthor } from "@/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const PAGE_SIZE = 20;

export const POST_SELECT = `id, content, media_paths, created_at, expires_at, audio_path, audio_duration, audio_peaks, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), comments(count)`;

/**
 * Feed dei post vivi (non scaduti), dal più recente.
 * - "seguiti": i tuoi post e quelli di chi segui
 * - "mondiale": i post di tutti
 */
export async function getFeed(supabase: Client, userId: string, scope: FeedScope, before?: string) {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (scope === "seguiti") {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    query = query.in("author_id", [userId, ...(follows ?? []).map((f) => f.following_id)]);
  }
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const posts = (data ?? []) as unknown as PostWithAuthor[];
  return { posts, hasMore: posts.length === PAGE_SIZE };
}

/** Post vivi di un singolo utente (pagina profilo). */
export async function getUserPosts(supabase: Client, authorId: string) {
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as PostWithAuthor[];
}
