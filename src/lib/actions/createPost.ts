"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_AUDIO_SECONDS, MAX_IMAGES_PER_POST, MAX_POST_LENGTH } from "@/lib/limits";
import type { ActionResult } from "@/types";

type AudioInput = { path: string; duration: number; peaks: number[] };

export async function createPost(
  content: string,
  mediaPaths: string[],
  audio: AudioInput | null = null
): Promise<ActionResult> {
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

  // audio: percorso nella cartella dell'utente, durata plausibile e forma d'onda ben formata
  let audioColumns: { audio_path: string; audio_duration: number; audio_peaks: number[] } | null = null;
  if (audio) {
    const duration = Math.round(audio.duration);
    const validPeaks =
      Array.isArray(audio.peaks) &&
      audio.peaks.length >= 8 &&
      audio.peaks.length <= 128 &&
      audio.peaks.every((n) => Number.isInteger(n) && n >= 0 && n <= 100);

    if (!audio.path.startsWith(`${user.id}/`) || audio.path.includes("..")) return { error: "File audio non valido." };
    if (!Number.isFinite(duration) || duration < 1 || duration > MAX_AUDIO_SECONDS + 10) {
      return { error: "Durata dell'audio non valida." };
    }
    if (!validPeaks) return { error: "Audio non valido." };
    audioColumns = { audio_path: audio.path, audio_duration: duration, audio_peaks: audio.peaks };
  }

  if (!text && mediaPaths.length === 0 && !audioColumns) {
    return { error: "Scrivi qualcosa, aggiungi una foto o un audio." };
  }

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content: text, media_paths: mediaPaths, ...audioColumns });
  if (error) return { error: "Non sono riuscito a pubblicare il post. Riprova." };

  revalidatePath("/home");
  return {};
}
