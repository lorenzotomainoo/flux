"use server";

import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/queries/posts";
import type { PostWithAuthor } from "@/types";

export async function loadFeed(before: string): Promise<{ posts: PostWithAuthor[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], hasMore: false };
  return getFeed(supabase, user.id, before);
}
