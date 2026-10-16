import type { createClient } from "@/lib/supabase/server";
import { AUTHOR_FIELDS } from "@/lib/fields";
import type { FeedScope, PostWithAuthor } from "@/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const PAGE_SIZE = 20;

const postSelect = (innerAuthor: boolean) =>
  `id, content, media_paths, created_at, expires_at, audio_path, audio_duration, audio_peaks, author:profiles!posts_author_id_fkey${innerAuthor ? "!inner" : ""}(${AUTHOR_FIELDS}), comments(count), post_likes(count), audio_likes(count)`;

export const POST_SELECT = postSelect(false);

type RawPost = Omit<PostWithAuthor, "like_count" | "liked" | "audio_like_count" | "audio_liked"> & {
  post_likes: { count: number }[];
  audio_likes: { count: number }[];
};

/** Trasforma i contatori incorporati in numeri semplici e aggiunge quali post/audio hai già apprezzato. */
async function withLikes(supabase: Client, viewerId: string, raw: RawPost[]): Promise<PostWithAuthor[]> {
  if (raw.length === 0) return [];
  const ids = raw.map((p) => p.id);

  const [{ data: mine }, { data: mineAudio }] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", viewerId).in("post_id", ids),
    supabase.from("audio_likes").select("post_id").eq("user_id", viewerId).in("post_id", ids),
  ]);
  const liked = new Set((mine ?? []).map((r) => r.post_id));
  const likedAudio = new Set((mineAudio ?? []).map((r) => r.post_id));

  return raw.map(({ post_likes, audio_likes, ...post }) => ({
    ...post,
    like_count: post_likes?.[0]?.count ?? 0,
    liked: liked.has(post.id),
    audio_like_count: audio_likes?.[0]?.count ?? 0,
    audio_liked: likedAudio.has(post.id),
  }));
}

/**
 * Feed dei post vivi (non scaduti), dal più recente.
 * - "seguiti": i tuoi post e quelli di chi segui
 * - "mondiale": i post di tutti gli account pubblici
 */
export async function getFeed(supabase: Client, userId: string, scope: FeedScope, before?: string) {
  // Mondiale: join interna con l'autore, per poter escludere gli account privati
  let query = supabase
    .from("posts")
    .select(postSelect(scope === "mondiale"))
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
  if (scope === "mondiale") {
    // gli account privati non compaiono nel feed Mondiale, nemmeno ai loro follower (li vedono in "Seguiti")
    query = query.eq("author.is_private", false);
  }
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const raw = (data ?? []) as unknown as RawPost[];
  const posts = await withLikes(supabase, userId, raw);
  return { posts, hasMore: raw.length === PAGE_SIZE };
}

/** Post vivi di un singolo utente (pagina profilo). */
export async function getUserPosts(supabase: Client, authorId: string, viewerId: string) {
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  return withLikes(supabase, viewerId, (data ?? []) as unknown as RawPost[]);
}
