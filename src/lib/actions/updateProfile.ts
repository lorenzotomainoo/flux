"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from "@/lib/limits";
import type { ActionResult } from "@/types";

type Input = {
  display_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  avatar_x: number;
  avatar_y: number;
  banner_x: number;
  banner_y: number;
};

export async function updateProfile(input: Input): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  const name = input.display_name.trim();
  const bio = input.bio.trim();
  if (!name || name.length > MAX_NAME_LENGTH) return { error: `Il nome deve avere 1-${MAX_NAME_LENGTH} caratteri.` };
  if (bio.length > MAX_BIO_LENGTH) return { error: `La bio può avere al massimo ${MAX_BIO_LENGTH} caratteri.` };

  const focus = [input.avatar_x, input.avatar_y, input.banner_x, input.banner_y];
  if (!focus.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)) {
    return { error: "Inquadratura non valida." };
  }

  // le immagini devono stare nei nostri bucket, nella cartella dell'utente
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;
  const okUrl = (url: string | null, bucket: string) =>
    url === null || url.startsWith(`${storageBase}/${bucket}/${user.id}/`);
  if (!okUrl(input.avatar_url, "avatars") || !okUrl(input.banner_url, "banners")) {
    return { error: "Immagine non valida." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name,
      bio,
      avatar_url: input.avatar_url,
      banner_url: input.banner_url,
      avatar_x: input.avatar_x,
      avatar_y: input.avatar_y,
      banner_x: input.banner_x,
      banner_y: input.banner_y,
    })
    .eq("id", user.id);
  if (error) return { error: "Non sono riuscito a salvare il profilo. Riprova." };

  revalidatePath("/", "layout");
  return {};
}
