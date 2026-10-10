"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMAGES_PER_POST, MAX_POST_LENGTH } from "@/lib/limits";
import type { ActionResult } from "@/types";

export async function createPost(content: string, mediaPaths: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  const text = content.trim();
  if (text.length > MAX_POST_LENGTH) return { error: `Massimo ${MAX_POST_LENGTH} caratteri.` };
  if (mediaPaths.length > MAX_IMAGES_PER_POST) {
    return { error: `Massimo ${MAX_IMAGES_PER_POST} foto per post.` };
  }
  // i file devono stare nella cartella dell'utente (la RLS dello storage lo garantisce già, qui doppio controllo)
  if (!mediaPaths.every((p) => p.startsWith(`${user.id}/`) && !p.includes(".."))) {
    return { error: "File non valido." };
  }
  if (!text && mediaPaths.length === 0) return { error: "Scrivi qualcosa o aggiungi una foto." };

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content: text, media_paths: mediaPaths });
  if (error) return { error: "Non sono riuscito a pubblicare il post. Riprova." };

  revalidatePath("/home");
  return {};
}
