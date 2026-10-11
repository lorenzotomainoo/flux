import type { createClient } from "@/lib/supabase/server";
import { AUTHOR_FIELDS } from "@/lib/fields";
import type { PostWithAuthor } from "@/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const PAGE_SIZE = 20;

export const POST_SELECT = `id, content, media_paths, created_at, expires_at, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), comments(count)`;

/** Feed: post vivi (non scaduti) tue e di chi segui, dal più recente. */
export async function getFeed(supabase: Client, userId: string, before?: string) {
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const authorIds = [userId, ...(follows ?? []).map((f) => f.following_id)];

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .in("author_id", authorIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
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
