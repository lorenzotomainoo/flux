"use server";

import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/queries/posts";
import type { FeedScope, PostWithAuthor } from "@/types";

export async function loadFeed(
  scope: FeedScope,
  before: string
): Promise<{ posts: PostWithAuthor[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { posts: [], hasMore: false };

  // il valore arriva dal client: accettiamo solo quelli previsti
  const safeScope: FeedScope = scope === "mondiale" ? "mondiale" : "seguiti";
  return getFeed(supabase, user.id, safeScope, before);
}
