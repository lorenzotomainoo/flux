"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  const { data: post } = await supabase
    .from("posts")
    .select("media_paths")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!post) return { error: "Post non trovato." };

  const paths = (post.media_paths ?? []) as string[];
  if (paths.length > 0) await supabase.storage.from("post-media").remove(paths);

  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) return { error: "Non sono riuscito a eliminare il post." };

  revalidatePath("/home");
  return {};
}
