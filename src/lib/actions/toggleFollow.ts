"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FollowStatus } from "@/types";

type Result = { status?: FollowStatus; error?: string };

/**
 * Segui / smetti di seguire.
 * - account pubblico: lo segui subito
 * - account privato: parte una RICHIESTA, che il proprietario deve accettare
 * - smettere di seguire annulla anche una richiesta in attesa
 */
export async function setFollow(targetId: string, targetUsername: string, follow: boolean): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };
  if (user.id === targetId) return { error: "Non puoi seguire te stesso." };

  const done = (status: FollowStatus): Result => {
    revalidatePath(`/${targetUsername}`);
    revalidatePath("/home");
    return { status };
  };

  if (!follow) {
    const [unfollow, cancel] = await Promise.all([
      supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId),
      supabase.from("follow_requests").delete().eq("requester_id", user.id).eq("target_id", targetId),
    ]);
    if (unfollow.error || cancel.error) return { error: "Operazione non riuscita." };
    return done("none");
  }

  const { data: target } = await supabase.from("profiles").select("is_private").eq("id", targetId).maybeSingle();
  if (!target) return { error: "Profilo non trovato." };

  const request = async (): Promise<Result> => {
    const { error } = await supabase.from("follow_requests").insert({ target_id: targetId });
    // 23505 = richiesta già inviata: va bene così
    if (error && error.code !== "23505") return { error: "Non sono riuscito a inviare la richiesta." };
    return done("requested");
  };

  if (target.is_private) return request();

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
  if (!error || error.code === "23505") return done("following");
  // 42501: nel frattempo l'account è diventato privato -> si passa dalla richiesta
  if (error.code === "42501") return request();
  return { error: "Operazione non riuscita." };
}
