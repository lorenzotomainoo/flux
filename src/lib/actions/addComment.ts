"use server";

import { createClient } from "@/lib/supabase/server";
import { MAX_COMMENT_LENGTH } from "@/lib/limits";
import type { CommentWithAuthor } from "@/types";

export async function addComment(
  postId: string,
  content: string
): Promise<{ comment?: CommentWithAuthor; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  const text = content.trim();
  if (!text) return { error: "Il commento è vuoto." };
  if (text.length > MAX_COMMENT_LENGTH) return { error: `Massimo ${MAX_COMMENT_LENGTH} caratteri.` };

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, content: text })
    .select(
      "id, content, created_at, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url)"
    )
    .single();

  if (error || !data) return { error: "Il post potrebbe essere scaduto. Riprova." };
  return { comment: data as unknown as CommentWithAuthor };
}
