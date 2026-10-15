import { createClient } from "@/lib/supabase/client";

export type LikeKind = "post" | "comment" | "audio";

/**
 * Mette o toglie un "mi piace". Restituisce true se è andata a buon fine.
 * (user_id lo compila da solo il database con l'utente collegato; la sicurezza è nelle regole del database)
 */
export async function setLike(kind: LikeKind, targetId: string, like: boolean): Promise<boolean> {
  const supabase = createClient();

  const run = async () => {
    switch (kind) {
      case "post": {
        const { error } = like
          ? await supabase.from("post_likes").insert({ post_id: targetId })
          : await supabase.from("post_likes").delete().eq("post_id", targetId);
        return error;
      }
      case "comment": {
        const { error } = like
          ? await supabase.from("comment_likes").insert({ comment_id: targetId })
          : await supabase.from("comment_likes").delete().eq("comment_id", targetId);
        return error;
      }
      case "audio": {
        const { error } = like
          ? await supabase.from("audio_likes").insert({ post_id: targetId })
          : await supabase.from("audio_likes").delete().eq("post_id", targetId);
        return error;
      }
    }
  };

  const error = await run();
  // 23505 = c'era già: va bene così
  return !error || error.code === "23505";
}

/** Quali tra questi commenti hai già apprezzato. */
export async function fetchLikedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>> {
  if (commentIds.length === 0) return new Set();
  const { data } = await createClient()
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  return new Set((data ?? []).map((r) => r.comment_id));
}
